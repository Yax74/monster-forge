import fs from "node:fs/promises";
import path from "node:path";
import { getBoostCatalog, prepareBoostItemData, setBoostCatalogItems } from "../scripts/boosts.js";

const output = path.resolve("packs-source/npc-content");
await fs.mkdir(output, { recursive: true });

const entries = [
  ["npc-action-template", "Blank NPC Action", "action", "Template", "Add the NPC action rules text and D&D5e activity data. This template is not intended to be added directly to a creature."],
  ["npc-trait-template", "Blank NPC Trait", "trait", "Template", "Add the passive or triggered NPC trait rules text and any relevant activities or effects. This template is not intended to be added directly to a creature."],
  ["species-feature-template", "Blank Species Feature", "species-trait", "Template", "Copy this item, set its supported species metadata, and add rules text or automation. This template is not intended to be added directly to a creature."],
  ["species-profile-template", "Blank Species Profile", "species-profile", "Template", "Copy this item, provide a unique speciesKey and profile metadata, and add or map its species-trait Items."],
  ["human-resourceful", "Resourceful", "species-trait", "Human", "This creature gains Heroic Inspiration when it finishes a Long Rest."],
  ["dwarf-stonecunning", "Stonecunning", "species-trait", "Dwarf", "This dwarf has a supernatural connection to stone that can reveal nearby vibrations. Set its range and duration to match the creature's challenge and intended use."],
  ["dwarf-resilience", "Dwarven Resilience", "species-trait", "Dwarf", "This creature has resistance to poison damage and advantage on saving throws to avoid or end the Poisoned condition."],
  ["elf-fey-ancestry", "Fey Ancestry", "species-trait", "Elf", "This creature has advantage on saving throws to avoid or end the Charmed condition."],
  ["elf-trance", "Trance", "species-trait", "Elf", "This creature doesn't need to sleep, and magic can't put it to sleep. It can finish a Long Rest in four hours of trancelike meditation."],
  ["elf-darkvision", "Elven Darkvision", "species-trait", "Elf", "This creature can see in darkness within 60 feet as if it were dim light, and in dim light as if it were bright light."],
  ["gnome-cunning", "Gnomish Cunning", "species-trait", "Gnome", "This creature has advantage on Intelligence, Wisdom, and Charisma saving throws."],
  ["gnome-darkvision", "Gnomish Darkvision", "species-trait", "Gnome", "This creature can see in darkness within 60 feet as if it were dim light, and in dim light as if it were bright light."],
  ["halfling-brave", "Brave", "species-trait", "Halfling", "This creature has advantage on saving throws to avoid or end the Frightened condition."],
  ["orc-adrenaline-rush", "Adrenaline Rush", "species-trait", "Orc", "As a Bonus Action, this creature can take the Dash action and gain Temporary Hit Points equal to its Proficiency Bonus. It can do this a number of times equal to its Proficiency Bonus, regaining all uses after a Short or Long Rest."],
  ["orc-relentless", "Relentless Endurance", "species-trait", "Orc", "When damage would reduce this creature to 0 Hit Points but not kill it outright, it can drop to 1 Hit Point instead. Once used, this trait recharges after a Long Rest."],
  ["aasimar-healing-hands", "Healing Hands", "species-trait", "Aasimar", "As an action, this creature can touch another creature and restore Hit Points. Set the amount appropriate to this NPC's role and challenge rating."],
  ["tiefling-legacy", "Fiendish Legacy", "species-trait", "Tiefling", "This creature's fiendish legacy grants a limited magical ability. Add the specific spells and uses appropriate to its lineage."],
  ["dragonborn-breath", "Breath Weapon", "species-trait", "Dragonborn", "When this creature takes the Attack action, it can replace one of its attacks with a breath weapon. Set its damage type, area, damage, and saving throw for this NPC's challenge rating."],
  ["goliath-giant-ancestry", "Giant Ancestry", "species-trait", "Goliath", "This creature manifests a gift tied to its giant ancestry. Select and describe the gift appropriate to this NPC."],
  ["drow-sunlight-adaptation", "Underdark Adaptation", "species-trait", "Drow", "This drow has keen darkvision and magic associated with its elven lineage. Add only the spells or senses that fit this NPC."],
  ["duergar-resilience", "Duergar Resilience", "species-trait", "Duergar", "This duergar retains its dwarf parent species traits. Add any Stygian-specific resistance or resilience here; no additional condition immunities are assumed."],
  ["deep-gnome-cunning", "Underdark Adaptation", "species-trait", "Deep Gnome", "This deep gnome's darkvision extends to 120 feet, and it is adapted to life underground. The parent Gnome profile supplies Gnomish Cunning."],
  ["gemling-crystalline", "Gemling Crystalline Adaptation", "species-trait", "Gemling", "A gemling bears a distinctive crystalline adaptation. Define its resistance, sense, movement, or other feature for this creature in the item description or activities."],
  ["beast-instinct", "Bestial Instinct", "species-trait", "Beast", "Describe this creature's distinctive natural sense, movement, or hunting adaptation here."],
  ["undead-unliving", "Unliving Nature", "species-trait", "Undead", "This creature does not require air, food, drink, or sleep. Add any additional undead defenses as separate NPC features."],
  ["construct-built", "Constructed Nature", "species-trait", "Construct", "This creature does not require air, food, drink, or sleep. Add any additional construct defenses as separate NPC features."]
];

const speciesIcons = {
  human: "icons/creatures/eyes/human-single-blue.webp",
  dwarf: "icons/commodities/stone/boulder-grey-blue.webp",
  halfling: "icons/consumables/food/bread-toast-tan.webp",
  gnome: "icons/magic/symbols/runes-star-blue.webp",
  elf: "icons/weapons/bows/shortbow-recurve-yellow-blue.webp",
  tiefling: "icons/magic/unholy/silhouette-evil-horned-giant.webp",
  aasimar: "icons/magic/holy/angel-wings-gray.webp",
  orc: "icons/weapons/axes/axe-battle-black.webp",
  goliath: "icons/creatures/magical/humanoid-giant-forest-blue.webp",
  dragonborn: "icons/creatures/abilities/dragon-fire-breath-orange.webp",
  drow: "icons/creatures/magical/spirit-undead-ghost-purple.webp",
  duergar: "icons/creatures/magical/construct-face-stone-pink.webp",
  deepGnome: "icons/commodities/tech/battery-arcane-crystal-green.webp",
  gemling: "icons/commodities/gems/gem-cluster-blue-white.webp",
  beast: "icons/creatures/mammals/beast-horned-scaled-glowing-orange.webp",
  undead: "icons/creatures/magical/spirit-undead-ghost-blue.webp",
  construct: "icons/creatures/magical/construct-golem-stone-blue.webp"
};

function stableId(text) {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return (value >>> 0).toString(16).padStart(8, "0") + text.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 8).padEnd(8, "0");
}

for (const [slug, name, kind, speciesLabel, description] of entries) {
  const species = speciesLabel === "Template" ? [] : [speciesLabel === "Deep Gnome" ? "deepGnome" : speciesLabel[0].toLowerCase() + speciesLabel.slice(1).replaceAll(" ", "")];
  const speciesKey = species[0];
  const id = stableId(slug);
  const data = {
    _key: `!items!${id}`,
    _id: id,
    name,
    type: "feat",
    img: kind === "species-trait" && speciesIcons[speciesKey] ? speciesIcons[speciesKey]
      : kind === "action" ? "icons/skills/melee/strike-sword-slashing-red.webp" : "icons/sundries/books/book-backed-blue-gold.webp",
    system: {
      description: { value: `<p>${description}</p>`, chat: "", unidentified: "" },
      source: { custom: "Monster Forge NPC Content" },
      type: { value: "monster" },
      activities: {},
      uses: { spent: 0, max: "", recovery: [] }
    },
    effects: [],
    flags: {
      "monster-forge": {
        library: {
          kind,
          species,
          category: kind === "species-trait" ? "species" : kind,
          template: speciesLabel === "Template",
          version: 1
        }
      }
    }
  };
  await fs.writeFile(path.join(output, `${slug}.json`), `${JSON.stringify(data, null, 2)}\n`);
}

const profiles = [
  ["human", "Human", "med", 30, 0], ["dwarf", "Dwarf", "med", 30, 120],
  ["halfling", "Halfling", "sm", 30, 0], ["gnome", "Gnome", "sm", 30, 60],
  ["elf", "Elf", "med", 30, 60], ["tiefling", "Tiefling", "med", 30, 60],
  ["aasimar", "Aasimar", "med", 30, 60], ["orc", "Orc", "med", 30, 120],
  ["goliath", "Goliath", "med", 35, 0], ["dragonborn", "Dragonborn", "med", 30, 60],
  ["drow", "Drow", "med", 30, 120], ["duergar", "Duergar", "med", 30, 120],
  ["deepGnome", "Deep Gnome", "sm", 30, 120], ["gemling", "Gemling", "med", 30, 0],
  ["aberration", "Aberration", "med", 30, 60], ["beast", "Beast", "med", 30, 0],
  ["celestial", "Celestial", "med", 30, 60], ["construct", "Construct", "med", 30, 0],
  ["dragon", "Dragon", "lg", 40, 120], ["elemental", "Elemental", "med", 30, 60],
  ["fey", "Fey", "sm", 30, 60], ["fiend", "Fiend", "med", 30, 120],
  ["giant", "Giant", "lg", 35, 0], ["monstrosity", "Monstrosity", "med", 30, 60],
  ["ooze", "Ooze", "med", 20, 60], ["plant", "Plant", "med", 25, 60],
  ["undead", "Undead", "med", 30, 60]
];

const abilities = {
  aberration: { int: 1, cha: 1 }, beast: { dex: 2, con: 1, int: -4, wis: 1, cha: -2 },
  celestial: { wis: 1, cha: 1 }, construct: { str: 1, dex: -1, con: 2, int: -2, cha: -2 },
  dragon: { str: 2, con: 1, cha: 1 }, elemental: { con: 1, int: -1 }, fey: { dex: 1, wis: 1, cha: 1 },
  fiend: { str: 1, con: 1, cha: 1 }, giant: { str: 2, con: 1, dex: -1 },
  monstrosity: { str: 1, dex: 1, con: 1 }, ooze: { dex: -2, int: -4, wis: -1, cha: -2 },
  plant: { con: 1, int: -1, wis: 1 }, undead: { str: 1, con: 1, wis: 1, cha: 1 }
};
const profileIcons = {
  beast: "icons/creatures/mammals/beast-horned-scaled-glowing-orange.webp",
  undead: "icons/creatures/magical/spirit-undead-ghost-blue.webp",
  construct: "icons/creatures/magical/construct-golem-stone-blue.webp",
  dragon: "icons/creatures/reptiles/dragon-horned-blue.webp",
  celestial: "icons/magic/holy/angel-winged-humanoid-blue.webp",
  fey: "icons/creatures/magical/fae-fairy-winged-glowing-green.webp"
};

const boostCategoryIcons = {
  initiative: "icons/skills/movement/feet-winged-boots-brown.webp",
  movement: "icons/skills/movement/feet-winged-boots-blue.webp",
  defence: "icons/magic/defensive/shield-barrier-blue.webp",
  resilience: "icons/magic/defensive/shield-barrier-blue.webp",
  recovery: "icons/magic/life/heart-cross-blue.webp",
  accuracy: "icons/skills/melee/strike-sword-slashing-red.webp",
  spellcasting: "icons/magic/symbols/runes-star-blue.webp",
  leadership: "icons/skills/social/diplomacy-handshake-blue.webp"
};

for (const [speciesKey, label, size, speed, darkvision] of profiles) {
  const slug = `species-profile-${speciesKey}`;
  const id = stableId(slug);
  const data = {
    _key: `!items!${id}`,
    _id: id,
    name: `${label} Species Profile`,
    type: "feat",
    img: profileIcons[speciesKey] ?? speciesIcons[speciesKey] ?? "icons/magic/symbols/runes-star-blue.webp",
    system: {
      description: { value: `<p>Starting profile: ${size}; walk ${speed} ft; darkvision ${darkvision} ft. Suggested ability adjustments are editable Monster Forge heuristics, not 2024 ancestry ability score rules. Traits are separate NPC Items.</p>`, chat: "", unidentified: "" },
      source: { custom: "Monster Forge NPC Content" },
      type: { value: "monster" },
      activities: {},
      uses: { spent: 0, max: "", recovery: [] }
    },
    effects: [],
    flags: {
      "monster-forge": {
        library: {
          kind: "species-profile",
          speciesKey,
          profile: { label, size, speed, darkvision, abilities: abilities[speciesKey] ?? {} },
          template: false,
          version: 1
        }
      }
    }
  };
  await fs.writeFile(path.join(output, `${slug}.json`), `${JSON.stringify(data, null, 2)}\n`);
}

// The bundled boost documents are complete, ready-to-use D&D5e Items. This
// uses the same preparation path as actor embedding so the compendium source
// includes native activities, uses, and supported DAE/Midi-QOL effects.
const boostFiles = (await fs.readdir(output)).filter((file) => file.startsWith("boost-") && file.endsWith(".json")).sort();
const boostDocuments = await Promise.all(boostFiles.map(async (file) => JSON.parse(await fs.readFile(path.join(output, file), "utf8"))));
const boostFileById = new Map(boostDocuments.map((document, index) => [document._id, boostFiles[index]]));
setBoostCatalogItems(boostDocuments);
const boostById = new Map(getBoostCatalog().entries.map((entry) => [entry.id, entry]));
for (const source of boostDocuments) {
  const library = source.flags?.["monster-forge"]?.library;
  const entry = boostById.get(library?.boost?.id);
  if (!entry) continue;
  const icon = boostCategoryIcons[library.category] ?? "icons/magic/control/silhouette-aura-energy.webp";
  const seed = source._id;
  let index = 0;
  const prepared = prepareBoostItemData({ ...entry, img: icon }, {
    setId: "library-source",
    idFactory: () => stableId(`${seed}-${index++}`).slice(0, 16)
  });
  for (const effect of prepared.effects ?? []) effect._key = `!effects!${effect._id}`;
  const data = {
    ...source,
    ...prepared,
    _key: source._key,
    _id: source._id,
    img: icon,
    system: { ...source.system, ...prepared.system, source: source.system.source },
    flags: {
      ...prepared.flags,
      "monster-forge": {
        ...prepared.flags?.["monster-forge"],
        library: { ...library, categoryIcon: icon, boost: { ...library.boost, img: icon } }
      }
    }
  };
  const file = boostFileById.get(source._id);
  if (!file) throw new Error(`No source file found for boost item ${source._id}`);
  await fs.writeFile(path.join(output, file), `${JSON.stringify(data, null, 2)}\n`);
}
