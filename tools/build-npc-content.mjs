import fs from "node:fs/promises";
import path from "node:path";

const output = path.resolve("packs-source/npc-content");
await fs.rm(output, { recursive: true, force: true });
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

function stableId(text) {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return (value >>> 0).toString(16).padStart(8, "0") + text.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 8).padEnd(8, "0");
}

for (const [slug, name, kind, speciesLabel, description] of entries) {
  const species = speciesLabel === "Template" ? [] : [speciesLabel === "Deep Gnome" ? "deepGnome" : speciesLabel[0].toLowerCase() + speciesLabel.slice(1).replaceAll(" ", "")];
  const id = stableId(slug);
  const data = {
    _key: `!items!${id}`,
    _id: id,
    name,
    type: "feat",
    img: "icons/svg/book.svg",
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
  ["beast", "Beast", "med", 30, 0], ["undead", "Undead", "med", 30, 0],
  ["construct", "Construct", "med", 30, 0]
];

for (const [speciesKey, label, size, speed, darkvision] of profiles) {
  const slug = `species-profile-${speciesKey}`;
  const id = stableId(slug);
  const data = {
    _key: `!items!${id}`,
    _id: id,
    name: `${label} Species Profile`,
    type: "feat",
    img: "icons/svg/book.svg",
    system: {
      description: { value: `<p>Species preset: ${size}; walk ${speed} ft; darkvision ${darkvision} ft. Ability scores remain unchanged under 2024 rules. GM-editable body defaults; traits are separate Items.</p>`, chat: "", unidentified: "" },
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
          profile: { label, size, speed, darkvision },
          template: false,
          version: 1
        }
      }
    }
  };
  await fs.writeFile(path.join(output, `${slug}.json`), `${JSON.stringify(data, null, 2)}\n`);
}
