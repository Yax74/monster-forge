import { MODULE_ID, MODULE_VERSION } from "./constants.js";

const DEFAULT_OPEN_CATEGORIES = Object.freeze(["initiative", "movement", "defence"]);
const POWER_LABELS = Object.freeze({ light: "Light", standard: "Standard", strong: "Strong", major: "Major" });
const AUTOMATION_LABELS = Object.freeze({ core: "Core effect", activity: "Core activity", midi: "Midi/DAE optional", manual: "Manual feature" });

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function collectionValues(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (typeof collection.values === "function") return [...collection.values()];
  return Object.values(collection);
}

function numericOptions({ prefix, name, values, summary, effect, impact, power = ["light", "standard", "strong"] }) {
  return values.map((value, index) => ({
    id: `${prefix}.${value}`,
    name: `${name} ${["I", "II", "III"][index] ?? value}`,
    label: `${value >= 0 ? "+" : ""}${value}`,
    summary: summary(value),
    description: summary(value),
    power: power[index] ?? "strong",
    automation: "core",
    effect: effect(value),
    impact: impact(value)
  }));
}

const INITIATIVE_OPTIONS = [
  ...numericOptions({
    prefix: "initiative.flat",
    name: "Quickness",
    values: [1, 2, 3],
    summary: (value) => `The creature gains a +${value} bonus to initiative.`,
    effect: (value) => [{ key: "system.attributes.init.bonus", value }],
    impact: (value) => ({ initiative: value })
  }),
  {
    id: "initiative.pb", name: "Battle Ready", label: "+ proficiency bonus",
    summary: "The creature adds its proficiency bonus to initiative.", description: "The creature adds its proficiency bonus to initiative.",
    power: "standard", automation: "core", effect: [{ key: "system.attributes.init.bonus", value: "@attributes.prof" }], impact: { initiativeProf: 1 }
  },
  {
    id: "initiative.pb2", name: "Perfect Readiness", label: "+ twice proficiency bonus",
    summary: "The creature adds twice its proficiency bonus to initiative.", description: "The creature adds twice its proficiency bonus to initiative.",
    power: "major", automation: "core", effect: [{ key: "system.attributes.init.bonus", value: "(2*@attributes.prof)" }], impact: { initiativeProf: 2 }
  },
  {
    id: "initiative.advantage", name: "Always Ready", label: "Advantage",
    summary: "The creature has advantage on initiative rolls.", description: "The creature has advantage on initiative rolls. Apply advantage when combat begins.",
    power: "standard", automation: "manual", impact: { note: "Advantage on initiative" }, activation: { type: "special", condition: "When initiative is rolled" }
  }
];

const SPEED_OPTIONS = numericOptions({
  prefix: "speed", name: "Swift", values: [5, 10, 15],
  summary: (value) => `The creature's walking speed increases by ${value} feet.`,
  effect: (value) => [{ key: "system.attributes.movement.walk", value }],
  impact: (value) => ({ speed: value })
});

const AC_OPTIONS = numericOptions({
  prefix: "ac", name: "Defended", values: [1, 2, 3],
  summary: (value) => `The creature gains a +${value} bonus to AC.`,
  effect: (value) => [{ key: "system.attributes.ac.bonus", value }],
  impact: (value) => ({ ac: value })
});

const SAVE_OPTIONS = [
  ...numericOptions({
    prefix: "saves.all", name: "Resilient", values: [1, 2, 3],
    summary: (value) => `The creature gains a +${value} bonus to all saving throws.`,
    effect: (value) => [{ key: "system.bonuses.abilities.save", value }],
    impact: (value) => ({ saves: value })
  }),
  {
    id: "saves.con-advantage", name: "Steadfast Constitution", label: "CON save advantage",
    summary: "The creature has advantage on Constitution saving throws.", description: "The creature has advantage on Constitution saving throws.",
    power: "standard", automation: "midi", effect: [{ key: "flags.midi-qol.advantage.ability.save.con", value: 1 }], impact: { note: "Advantage on CON saves" }
  },
  {
    id: "saves.mental-advantage", name: "Indomitable Mind", label: "INT/WIS/CHA save advantage",
    summary: "The creature has advantage on Intelligence, Wisdom, and Charisma saving throws.", description: "The creature has advantage on Intelligence, Wisdom, and Charisma saving throws.",
    power: "major", automation: "midi", effect: ["int", "wis", "cha"].map((ability) => ({ key: `flags.midi-qol.advantage.ability.save.${ability}`, value: 1 })), impact: { note: "Advantage on mental saves" }
  },
  {
    id: "saves.charm-fear", name: "Iron Will", label: "Charm/frightened advantage",
    summary: "The creature has advantage on saves against being charmed or frightened.", description: "The creature has advantage on saving throws against being charmed or frightened.",
    power: "standard", automation: "manual", impact: { note: "Advantage vs. charmed/frightened" }
  },
  {
    id: "saves.poison", name: "Hardy", label: "Poison advantage",
    summary: "The creature has advantage on saves against poison.", description: "The creature has advantage on saving throws against poison.",
    power: "light", automation: "manual", impact: { note: "Advantage vs. poison" }
  },
  {
    id: "saves.magic-resistance", name: "Magic Resistance", label: "Magic Resistance",
    summary: "The creature has advantage on saving throws against spells and other magical effects.", description: "The creature has advantage on saving throws against spells and other magical effects.",
    power: "major", automation: "manual", impact: { note: "Advantage vs. magic" }
  }
];

const WEAPON_ACCURACY_OPTIONS = numericOptions({
  prefix: "accuracy.weapon", name: "Weapon Training", values: [1, 2, 3],
  summary: (value) => `The creature gains a +${value} bonus to melee and ranged weapon attack rolls.`,
  effect: (value) => ["mwak", "rwak"].map((type) => ({ key: `system.bonuses.${type}.attack`, value })),
  impact: (value) => ({ weaponAttack: value })
});

const SPELL_ATTACK_OPTIONS = numericOptions({
  prefix: "spell.attack", name: "Spell Precision", values: [1, 2, 3],
  summary: (value) => `The creature gains a +${value} bonus to melee and ranged spell attack rolls.`,
  effect: (value) => ["msak", "rsak"].map((type) => ({ key: `system.bonuses.${type}.attack`, value })),
  impact: (value) => ({ spellAttack: value })
});

const SPELL_DC_OPTIONS = numericOptions({
  prefix: "spell.dc", name: "Potent Spellcasting", values: [1, 2],
  summary: (value) => `The creature gains a +${value} bonus to its spell save DC.`,
  effect: (value) => [{ key: "system.bonuses.spell.dc", value }],
  impact: (value) => ({ spellDc: value }), power: ["standard", "strong"]
});

export const BOOST_CATEGORIES = Object.freeze([
  {
    id: "initiative", label: "Initiative", icon: "fa-solid fa-bolt", description: "Turn-order boosts. Choose one.",
    groups: [{ id: "initiative-bonus", label: "Initiative boost", help: "Flat, proficiency-scaled, or advantage", options: INITIATIVE_OPTIONS }]
  },
  {
    id: "movement", label: "Movement", icon: "fa-solid fa-person-running", description: "Raw speed and one signature mobility feature.",
    groups: [
      { id: "movement-speed", label: "Speed bonus", help: "Applies to walking speed without granting new movement types", options: SPEED_OPTIONS },
      { id: "movement-ability", label: "Movement ability", help: "One signature mobility option", options: [
        { id: "movement.nimble-dash", name: "Nimble Dash", label: "Nimble Dash", summary: "The creature can take the Dash action as a bonus action.", description: "The creature can take the Dash action as a bonus action.", power: "light", automation: "activity", activation: { type: "bonus" }, impact: { action: "Bonus-action Dash" } },
        { id: "movement.fleet-footed", name: "Fleet Footed", label: "Fleet Footed", summary: "The creature can Dash or Disengage as a bonus action.", description: "The creature can take the Dash or Disengage action as a bonus action.", power: "standard", automation: "activity", activation: { type: "bonus" }, impact: { action: "Bonus-action Dash/Disengage" } },
        { id: "movement.cunning-action", name: "Cunning Action", label: "Cunning Action", summary: "The creature can Dash, Disengage, or Hide as a bonus action.", description: "The creature can take the Dash, Disengage, or Hide action as a bonus action.", power: "strong", automation: "activity", activation: { type: "bonus" }, impact: { action: "Bonus-action Dash/Disengage/Hide" } },
        { id: "movement.skirmisher", name: "Skirmisher", label: "Skirmisher", summary: "Reaction movement when a hostile creature ends its turn within 5 feet.", description: "When a hostile creature ends its turn within 5 feet of the creature, the creature can use its reaction to move up to half its speed. This movement doesn't provoke opportunity attacks.", power: "standard", automation: "manual", activation: { type: "reaction", condition: "A hostile creature ends its turn within 5 feet" }, impact: { action: "Reaction movement" } },
        { id: "movement.flyby", name: "Flyby", label: "Flyby", summary: "The creature doesn't provoke opportunity attacks when it flies out of an enemy's reach.", description: "The creature doesn't provoke opportunity attacks when it flies out of an enemy's reach.", power: "standard", automation: "manual", impact: { note: "Flyby; requires a fly speed" } },
        { id: "movement.wall-crawler", name: "Wall Crawler", label: "Wall Crawler", summary: "Climb difficult surfaces, including ceilings, without an ability check.", description: "The creature can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.", power: "light", automation: "manual", impact: { note: "Spider-like climbing" } },
        { id: "movement.arcane-blink", name: "Arcane Blink", label: "Arcane Blink", summary: "After an attack or spell, teleport up to 10 feet without provoking opportunity attacks.", description: "Immediately after the creature makes an attack or casts a spell, it can teleport up to 10 feet to an unoccupied space it can see. This movement doesn't provoke opportunity attacks.", power: "strong", automation: "manual", activation: { type: "special", condition: "Immediately after an attack or spell" }, impact: { action: "Free 10-foot teleport after an attack or spell" } },
        { id: "movement.void-step", name: "Void Step", label: "Void Step", summary: "As a bonus action, teleport up to 30 feet; recharge 4–6.", description: "As a bonus action, the creature teleports up to 30 feet to an unoccupied space it can see. It can't use Void Step again until it recharges (4–6).", power: "major", automation: "activity", activation: { type: "bonus" }, uses: { max: "1", period: "recharge", formula: "4" }, impact: { action: "Recharge bonus-action teleport" } }
      ] }
    ]
  },
  {
    id: "defence", label: "Defence", icon: "fa-solid fa-shield-halved", description: "Passive AC or one defensive reaction.",
    groups: [
      { id: "defence-ac", label: "Passive AC boost", help: "Applied after the FoF foundation", options: AC_OPTIONS },
      { id: "defence-reaction", label: "Defensive reaction", help: "Choose one competing reaction", options: [
        { id: "reaction.parry", name: "Parry", label: "Parry (+PB AC)", summary: "Add PB to AC against one visible melee attack that would hit.", description: "The creature adds its proficiency bonus to its AC against one melee attack that would hit it. To do so, the creature must see the attacker and be wielding a melee weapon or shield.", power: "standard", automation: "manual", activation: { type: "reaction", condition: "A visible melee attack would hit" }, impact: { action: "Reaction: +PB AC vs. one melee attack" } },
        { id: "reaction.greater-parry", name: "Greater Parry", label: "Greater Parry (+2×PB AC)", summary: "Add twice PB to AC against one visible melee attack that would hit.", description: "The creature adds twice its proficiency bonus to its AC against one melee attack that would hit it. To do so, the creature must see the attacker and be wielding a melee weapon or shield.", power: "major", automation: "manual", activation: { type: "reaction", condition: "A visible melee attack would hit" }, impact: { action: "Reaction: +2×PB AC vs. one melee attack" } },
        { id: "reaction.defensive-roll", name: "Defensive Roll", label: "Defensive Roll", summary: "Use a reaction to reduce damage from a seen attacker by 1d10 + PB.", description: "When the creature takes damage from an attacker it can see, it can use its reaction to reduce the damage by 1d10 + its proficiency bonus (to a minimum of 0 damage).", power: "standard", automation: "manual", activation: { type: "reaction", condition: "The creature takes damage from a visible attacker" }, impact: { action: "Reaction damage reduction" } },
        { id: "reaction.uncanny-dodge", name: "Uncanny Dodge", label: "Uncanny Dodge", summary: "Use a reaction to halve the damage of one visible attack.", description: "When an attacker the creature can see hits it with an attack, the creature can use its reaction to halve the attack's damage against it.", power: "strong", automation: "manual", activation: { type: "reaction", condition: "A visible attacker hits" }, impact: { action: "Reaction: halve one attack's damage" } },
        { id: "reaction.deflect-missiles", name: "Deflect Missiles", label: "Deflect Missiles", summary: "Use a reaction to reduce ranged weapon damage by 1d10 + DEX modifier + PB.", description: "When the creature is hit by a ranged weapon attack, it can use its reaction to reduce the damage by 1d10 + its Dexterity modifier + its proficiency bonus.", power: "standard", automation: "manual", activation: { type: "reaction", condition: "The creature is hit by a ranged weapon attack" }, impact: { action: "Reaction ranged-damage reduction" } }
      ] }
    ]
  },
  {
    id: "resilience", label: "Saving Throws", icon: "fa-solid fa-dice-d20", description: "Broad bonuses or focused resilience.",
    groups: [{ id: "saving-resilience", label: "Saving throw boost", help: "Choose one broad or focused defence", options: SAVE_OPTIONS }]
  },
  {
    id: "recovery", label: "Recovery", icon: "fa-solid fa-heart-pulse", description: "One healing or survival feature.",
    groups: [{ id: "recovery-feature", label: "Recovery feature", help: "Adds a native activity or clear manual trigger", options: [
      { id: "recovery.second-wind", name: "Second Wind", label: "Second Wind", summary: "Bonus action; regain PBd10 hit points once per long rest.", description: "As a bonus action, the creature regains a number of hit points equal to its proficiency bonus in d10s.", power: "strong", automation: "activity", activation: { type: "bonus" }, uses: { max: "1", period: "day" }, healing: { formula: "(@prof)d10" }, impact: { recovery: "PBd10 once per long rest", action: "Bonus action" } },
      { id: "recovery.relentless-endurance", name: "Relentless Endurance", label: "Relentless Endurance", summary: "At 0 HP but not killed outright, drop to 1 HP instead; once per long rest.", description: "When the creature is reduced to 0 hit points but not killed outright, it can drop to 1 hit point instead. Once it uses this feature, it can't use it again until it finishes a long rest.", power: "strong", automation: "manual", activation: { type: "special", condition: "Reduced to 0 hit points but not killed outright" }, uses: { max: "1", period: "day" }, impact: { recovery: "Survive at 1 HP once per long rest" } },
      { id: "recovery.regeneration.pb", name: "Regeneration I", label: "Regeneration: PB", summary: "At turn start, regain PB hit points while above 0 HP.", description: "The creature regains hit points equal to its proficiency bonus at the start of each of its turns if it has at least 1 hit point.", power: "standard", automation: "activity", activation: { type: "special", condition: "At the start of its turn while above 0 hit points" }, healing: { formula: "@prof" }, impact: { recovery: "PB each turn" } },
      { id: "recovery.regeneration.pb2", name: "Regeneration II", label: "Regeneration: 2×PB", summary: "At turn start, regain twice PB hit points while above 0 HP.", description: "The creature regains hit points equal to twice its proficiency bonus at the start of each of its turns if it has at least 1 hit point.", power: "strong", automation: "activity", activation: { type: "special", condition: "At the start of its turn while above 0 hit points" }, healing: { formula: "(2*@prof)" }, impact: { recovery: "2×PB each turn" } },
      { id: "recovery.regeneration.pb3", name: "Regeneration III", label: "Regeneration: 3×PB", summary: "At turn start, regain three times PB hit points while above 0 HP.", description: "The creature regains hit points equal to three times its proficiency bonus at the start of each of its turns if it has at least 1 hit point.", power: "major", automation: "activity", activation: { type: "special", condition: "At the start of its turn while above 0 hit points" }, healing: { formula: "(3*@prof)" }, impact: { recovery: "3×PB each turn" } }
    ] }]
  },
  {
    id: "accuracy", label: "Weapon Accuracy", icon: "fa-solid fa-crosshairs", description: "Bonuses to all weapon attack rolls.",
    groups: [{ id: "weapon-accuracy", label: "Weapon attack bonus", help: "Stacks after generated attack accuracy", options: WEAPON_ACCURACY_OPTIONS }]
  },
  {
    id: "spellcasting", label: "Spellcasting", icon: "fa-solid fa-wand-sparkles", description: "Spell accuracy, DC, and effective caster progression.",
    groups: [
      { id: "spell-accuracy", label: "Spell attack bonus", help: "Melee and ranged spell attacks", options: SPELL_ATTACK_OPTIONS },
      { id: "spell-dc", label: "Spell save DC bonus", help: "Applies after the foundation DC", options: SPELL_DC_OPTIONS },
      { id: "caster-progression", label: "Caster progression", help: "Records effective caster level; spells remain your choice", options: [
        { id: "caster.quarter", name: "NPC Quarter Caster", label: "Quarter caster", summary: "Effective caster level is one-quarter CR (minimum 1).", description: "The creature is a quarter caster. Its effective caster level is one-quarter its challenge rating, rounded down (minimum 1). This feature doesn't add spells automatically.", power: "light", automation: "manual", kind: "caster", progression: 0.25, impact: { note: "Quarter-caster progression" } },
        { id: "caster.half", name: "NPC Half Caster", label: "Half caster", summary: "Effective caster level is one-half CR (minimum 1).", description: "The creature is a half caster. Its effective caster level is one-half its challenge rating, rounded down (minimum 1). This feature doesn't add spells automatically.", power: "standard", automation: "manual", kind: "caster", progression: 0.5, impact: { note: "Half-caster progression" } },
        { id: "caster.full", name: "NPC Full Caster", label: "Full caster", summary: "Effective caster level equals CR (minimum 1).", description: "The creature is a full caster. Its effective caster level equals its challenge rating (minimum 1). This feature doesn't add spells automatically.", power: "strong", automation: "manual", kind: "caster", progression: 1, impact: { note: "Full-caster progression" } }
      ] }
    ]
  },
  {
    id: "leadership", label: "Leadership", icon: "fa-solid fa-flag", description: "Support and command features; choose one.",
    groups: [{ id: "leadership-feature", label: "Leadership feature", help: "Action-economy impact is called out in Review", options: [
      { id: "leadership.master-tactics", name: "Master of Tactics", label: "Master of Tactics", summary: "Use Help as a bonus action at 30 feet.", description: "The creature can take the Help action as a bonus action. When it does so to aid an ally in attacking a creature, the target can be within 30 feet of the creature, rather than 5 feet, if the target can see or hear it.", power: "standard", automation: "activity", activation: { type: "bonus" }, impact: { action: "Bonus-action Help at 30 feet" } },
      { id: "leadership.tactical-guidance", name: "Tactical Guidance", label: "Tactical Guidance", summary: "Grant one ally within 30 feet advantage on its next attack, check, or save before your next turn.", description: "As a bonus action, the creature chooses one ally within 30 feet that can see or hear it. Before the start of the creature's next turn, the ally can gain advantage on one attack roll, ability check, or saving throw of its choice.", power: "strong", automation: "midi", activation: { type: "bonus" }, impact: { action: "Bonus action; grants advantage" } },
      { id: "leadership.rally", name: "Rally", label: "Rally", summary: "Bonus action; grant 1d8 + CHA modifier temporary HP; recharge 5–6.", description: "As a bonus action, the creature chooses one ally within 30 feet that can see or hear it. That ally gains 1d8 + the creature's Charisma modifier temporary hit points. Rally then recharges on a 5–6.", power: "strong", automation: "activity", activation: { type: "bonus" }, uses: { max: "1", period: "recharge", formula: "5" }, healing: { number: 1, denomination: 8, bonus: "@abilities.cha.mod", type: "temphp", target: "ally", range: 30 }, impact: { recovery: "1d8 + CHA temporary HP", action: "Recharge bonus action" } },
      { id: "leadership.command-ally", name: "Command Ally", label: "Command Ally", summary: "Bonus action; one ally can use its reaction to make one weapon attack; recharge 5–6.", description: "As a bonus action, the creature chooses one ally within 30 feet that can hear it. That ally can use its reaction to make one weapon attack. Command Ally then recharges on a 5–6.", power: "major", automation: "manual", activation: { type: "bonus" }, uses: { max: "1", period: "recharge", formula: "5" }, impact: { action: "Grants one reaction attack" } },
      { id: "leadership.command-1", name: "Command I", label: "Command I", summary: "Action; up to two allies can each use a reaction to make one weapon attack.", description: "As an action, the creature chooses up to two allies within 30 feet that can hear it. Each chosen ally can use its reaction to make one weapon attack.", power: "major", automation: "manual", activation: { type: "action" }, impact: { action: "Grants up to two reaction attacks" } },
      { id: "leadership.command-2", name: "Command II", label: "Command II", summary: "Action; up to three allies can each use a reaction to attack; recharge 5–6.", description: "As an action, the creature chooses up to three allies within 60 feet that can hear it. Each chosen ally can use its reaction to make one weapon attack. Command II then recharges on a 5–6.", power: "major", automation: "manual", activation: { type: "action" }, uses: { max: "1", period: "recharge", formula: "5" }, impact: { action: "Grants up to three reaction attacks" } }
    ] }]
  }
]);

const GROUPS = BOOST_CATEGORIES.flatMap((category) => category.groups.map((group) => ({ ...group, categoryId: category.id, categoryLabel: category.label })));
const GROUP_BY_ID = new Map(GROUPS.map((group) => [group.id, group]));
const ENTRY_BY_ID = new Map();
for (const group of GROUPS) {
  for (const option of group.options) {
    ENTRY_BY_ID.set(option.id, {
      ...option,
      groupId: group.id,
      groupLabel: group.label,
      subcategory: group.label,
      categoryId: group.categoryId,
      categoryLabel: group.categoryLabel,
      exclusiveGroup: group.id,
      rank: parseBoostVariant(option.name).rank,
      requirements: option.automation === "midi" ? ["midi-qol", "dae"] : []
    });
  }
}

const LEGACY_NAME_MAP = Object.freeze({
  "Quickness I": "initiative.pb", "Quickness II": "initiative.pb2", "Nimble I": "ac.1", "Nimble II": "ac.2",
  "Skilled I": "accuracy.weapon.1", "Skilled II": "accuracy.weapon.2", "Spellslinger II": "spell.attack.2", "Potent Spell Caster II": "spell.dc.2",
  "NPC Quarter Caster": "caster.quarter", "NPC Half Caster": "caster.half", "NPC Full Caster": "caster.full",
  "Parry": "reaction.parry", "Parry II": "reaction.greater-parry", "Second Wind": "recovery.second-wind", "Regeneration": "recovery.regeneration.pb2",
  "Nimble Dash": "movement.nimble-dash", "Fleet Footed": "movement.fleet-footed", "Cunning Action": "movement.cunning-action", "Skirmisher": "movement.skirmisher",
  "Flyby": "movement.flyby", "Wall Crawler": "movement.wall-crawler", "Arcane Blink": "movement.arcane-blink", "Void Step": "movement.void-step",
  "Master of Tactics": "leadership.master-tactics", "Tactical Guidance": "leadership.tactical-guidance", "Rally": "leadership.rally",
  "Command Ally": "leadership.command-ally", "Command I": "leadership.command-1", "Command II": "leadership.command-2"
});

export function getBoostCatalog() {
  return { categories: BOOST_CATEGORIES, groups: GROUPS, entries: [...ENTRY_BY_ID.values()], version: MODULE_VERSION, source: "built-in" };
}

/** Backward-compatible API name. It no longer scans compendia. */
export async function discoverBoostCatalog() {
  return getBoostCatalog();
}

export function parseBoostVariant(name) {
  const text = String(name ?? "").trim();
  const caster = { "NPC Quarter Caster": 1, "NPC Half Caster": 2, "NPC Full Caster": 3 }[text];
  if (caster) return { family: "Caster Progression", rank: caster, rankLabel: ["Quarter caster", "Half caster", "Full caster"][caster - 1], kind: "caster" };
  const match = text.match(/^(.*?)(?:\s+(I{1,3}|[1-3]))$/i);
  if (!match) return { family: text || "Unnamed Boost", rank: null, rankLabel: null, kind: "boost" };
  const ranks = { I: 1, II: 2, III: 3 };
  const rank = ranks[match[2].toUpperCase()] ?? Number(match[2]);
  return { family: match[1].trim() || text, rank, rankLabel: `Rank ${["", "I", "II", "III"][rank]}`, kind: "boost" };
}

function stringMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [String(key), String(entry ?? "").trim()]));
}

export function normalizeBoostConfig(input = {}) {
  const source = input.boosts ?? input ?? {};
  const selections = {};
  let legacyCount = Number(source.legacyCount) || 0;
  for (const [groupId, boostId] of Object.entries(stringMap(source.selections))) {
    const entry = ENTRY_BY_ID.get(boostId);
    if (entry?.groupId === groupId) selections[groupId] = boostId;
  }
  const legacySelections = new Set();
  for (const value of Array.isArray(source.selected) ? source.selected : []) {
    const id = String(value ?? "").trim();
    const entry = ENTRY_BY_ID.get(id);
    if (entry && !selections[entry.groupId]) selections[entry.groupId] = id;
    else if (id.startsWith("Compendium.")) legacySelections.add(id);
  }
  legacyCount += legacySelections.size;
  const rawNames = stringMap(source.names ?? source.customNames);
  const names = {};
  for (const [groupId, value] of Object.entries(rawNames)) if (GROUP_BY_ID.has(groupId) && value) names[groupId] = value.slice(0, 80);
  const openCategories = [...new Set((Array.isArray(source.openCategories) ? source.openCategories : DEFAULT_OPEN_CATEGORIES)
    .map(String).filter((id) => BOOST_CATEGORIES.some((category) => category.id === id)))];
  return {
    selections,
    names,
    search: String(source.search ?? "").trim().slice(0, 80),
    selectedOnly: Boolean(source.selectedOnly),
    openCategories,
    legacyCount
  };
}

export function parseBoostForm(formData) {
  const selections = {};
  const names = {};
  for (const group of GROUPS) {
    const selected = String(formData.get(`boosts.selection.${group.id}`) ?? "").trim();
    const name = String(formData.get(`boosts.name.${group.id}`) ?? "").trim();
    if (selected) selections[group.id] = selected;
    if (name) names[group.id] = name;
  }
  return normalizeBoostConfig({
    selections, names,
    search: formData.get("boosts.search") ?? "",
    selectedOnly: formData.has("boosts.selectedOnly"),
    openCategories: formData.getAll("boosts.openCategories")
  });
}

export function recommendBoosts({ role = "balanced", tier = "standard" } = {}) {
  const rank = { minion: 1, standard: 1, elite: 2, boss: 3 }[tier] ?? 1;
  const byRole = {
    balanced: [`initiative.flat.${rank}`, `saves.all.${rank}`],
    brute: [`saves.all.${rank}`, "recovery.second-wind"],
    soldier: [`ac.${rank}`, rank >= 3 ? "reaction.greater-parry" : "reaction.parry"],
    skirmisher: [rank >= 2 ? "initiative.pb" : "initiative.flat.1", `speed.${rank * 5}`, "movement.skirmisher"],
    sniper: [`initiative.flat.${rank}`, `accuracy.weapon.${rank}`, "movement.skirmisher"],
    controller: [`spell.dc.${Math.min(rank, 2)}`, "movement.arcane-blink", "leadership.tactical-guidance"],
    support: [`saves.all.${rank}`, "leadership.master-tactics"],
    caster: [`spell.attack.${rank}`, `spell.dc.${Math.min(rank, 2)}`, "caster.full", "movement.arcane-blink"],
    leader: ["initiative.pb", rank >= 3 ? "leadership.command-2" : rank >= 2 ? "leadership.command-ally" : "leadership.rally"]
  };
  return [...new Set((byRole[role] ?? byRole.balanced).filter((id) => ENTRY_BY_ID.has(id)))];
}

export function buildBoostCategories(config = {}, recommended = []) {
  const normalized = normalizeBoostConfig(config);
  const recommendedSet = new Set(recommended);
  return BOOST_CATEGORIES.map((category) => {
    const groups = category.groups.map((group) => {
      const selectedId = normalized.selections[group.id] ?? "";
      return {
        ...group, selectedId, customName: normalized.names[group.id] ?? "", hasSelection: Boolean(selectedId),
        options: group.options.map((option) => ({
          ...option,
          value: option.id,
          selected: option.id === selectedId,
          recommended: recommendedSet.has(option.id),
          powerLabel: POWER_LABELS[option.power] ?? option.power,
          automationLabel: AUTOMATION_LABELS[option.automation] ?? option.automation,
          actionLabel: option.activation?.type ? `${option.activation.type} timing` : "Passive",
          impactLabel: Object.keys(option.impact ?? {}).some((key) => ["ac", "weaponAttack", "spellAttack", "spellDc"].includes(key)) ? "FoF stat" : "Feature layer"
        }))
      };
    });
    const selectedCount = groups.filter((group) => group.hasSelection).length;
    return { ...category, groups, selectedCount, hasSelection: selectedCount > 0, open: normalized.openCategories.includes(category.id) || selectedCount > 0 };
  });
}

/** Compatibility wrapper for the pre-1.6 UI API. */
export function buildBoostGroups(_catalog, selected = []) {
  const config = normalizeBoostConfig({ selected });
  return { groups: buildBoostCategories(config).flatMap((category) => category.groups), blocked: [] };
}

function itemFlag(item, key) {
  try {
    const value = item?.getFlag?.(MODULE_ID, key);
    if (value !== undefined) return value;
  } catch (_error) {
    // Stored data remains readable when a prior module scope is inactive.
  }
  return item?.flags?.[MODULE_ID]?.[key] ?? item?._source?.flags?.[MODULE_ID]?.[key];
}

export function restoreBoostConfig(actor, fallback = {}) {
  const normalized = normalizeBoostConfig(fallback);
  const generated = collectionValues(actor?.items).filter((item) => itemFlag(item, "generated") && itemFlag(item, "kind") === "boost");
  if (!generated.length) return normalized;
  const selections = {};
  const names = {};
  let legacyCount = 0;
  for (const item of generated) {
    const id = itemFlag(item, "boostId") ?? LEGACY_NAME_MAP[item?.name];
    const entry = ENTRY_BY_ID.get(id);
    if (!entry) {
      legacyCount += 1;
      continue;
    }
    selections[entry.groupId] = id;
    delete names[entry.groupId];
    const customName = String(itemFlag(item, "customName") ?? "").trim();
    if (customName) names[entry.groupId] = customName.slice(0, 80);
    else if (item?.name && item.name !== entry.name && !LEGACY_NAME_MAP[item.name]) names[entry.groupId] = String(item.name).slice(0, 80);
  }
  return normalizeBoostConfig({ ...normalized, selections: Object.keys(selections).length ? selections : normalized.selections, names: Object.keys(selections).length ? names : normalized.names, legacyCount: normalized.legacyCount + legacyCount });
}

export function selectBoosts(config = {}, { actor = null } = {}) {
  const normalized = normalizeBoostConfig(config);
  const selected = [];
  const warnings = [];
  if (normalized.legacyCount) warnings.push(`${normalized.legacyCount} saved compendium boost selection(s) could not be migrated automatically. Choose a built-in replacement; no source compendium is required now.`);
  for (const group of GROUPS) {
    const id = normalized.selections[group.id];
    if (!id) continue;
    const entry = ENTRY_BY_ID.get(id);
    if (!entry || entry.groupId !== group.id) continue;
    const customName = normalized.names[group.id] ?? "";
    selected.push({
      ...entry,
      customName,
      displayName: customName || entry.name,
      powerLabel: POWER_LABELS[entry.power] ?? entry.power,
      automationLabel: AUTOMATION_LABELS[entry.automation] ?? entry.automation,
      actionLabel: entry.activation?.type ? `${entry.activation.type} timing` : "Passive",
      impactLabel: Object.keys(entry.impact ?? {}).some((key) => ["ac", "weaponAttack", "spellAttack", "spellDc"].includes(key)) ? "FoF stat" : "Feature layer"
    });
  }
  const selectedNames = new Set(selected.flatMap((entry) => [entry.name, entry.displayName]).map((name) => name.toLowerCase()));
  const possibleDuplicates = collectionValues(actor?.items)
    .filter((item) => !itemFlag(item, "generated") && selectedNames.has(String(item?.name ?? "").toLowerCase()))
    .map((item) => item.name);
  if (possibleDuplicates.length) warnings.push(`Possible equivalent actor feature${possibleDuplicates.length === 1 ? "" : "s"} already present: ${[...new Set(possibleDuplicates)].join(", ")}.`);
  const major = selected.filter((entry) => entry.power === "major");
  if (major.length >= 2) warnings.push(`${major.length} major-power boosts are selected (${major.map((entry) => entry.displayName).join(", ")}). Review their combined durability and action-economy impact.`);
  const needsMidi = selected.some((entry) => entry.automation === "midi");
  const midiReady = Boolean(globalThis.game?.modules?.get?.("midi-qol")?.active && globalThis.game?.modules?.get?.("dae")?.active);
  if (needsMidi && !midiReady) warnings.push("A selected boost has optional Midi-QOL/DAE support. Its rule text remains usable, but conditional advantage must be resolved manually while either module is inactive.");
  return { config: normalized, selected, warnings };
}

function resolvedImpact(entry, proficiency) {
  const impact = { ...(entry.impact ?? {}) };
  if (impact.initiativeProf) impact.initiative = impact.initiativeProf * proficiency;
  return impact;
}

export function calculateBoostImpact(selected = [], { actorProfile = {}, foundation = null, plan = null } = {}) {
  const proficiency = Number(foundation?.proficiency ?? actorProfile.proficiency) || 2;
  const total = { initiative: 0, speed: 0, ac: 0, saves: 0, weaponAttack: 0, spellAttack: 0, spellDc: 0, notes: [], actions: [], recovery: [] };
  for (const entry of selected) {
    const impact = resolvedImpact(entry, proficiency);
    for (const key of ["initiative", "speed", "ac", "saves", "weaponAttack", "spellAttack", "spellDc"]) total[key] += Number(impact[key]) || 0;
    if (impact.note) total.notes.push(impact.note);
    if (impact.action) total.actions.push(impact.action);
    if (impact.recovery) total.recovery.push(impact.recovery);
  }
  const sections = plan?.config?.sections ?? {};
  const foundationApplied = sections.foundation !== false && foundation?.config?.mode === "apply";
  const baseAc = foundationApplied && foundation.config.manage.ac ? foundation.final.ac : Number(actorProfile.ac) || 0;
  const baseSpeed = foundationApplied && foundation.config.manage.body && foundation.body.speed !== null ? foundation.body.speed : Number(actorProfile.speed) || 0;
  const baseAttack = Number(plan?.primary?.attackBonus ?? plan?.suggestedAttackBonus ?? foundation?.final?.attackBonus) || 0;
  const baseSpellAttack = Number(foundation?.casting?.attackBonus) || 0;
  const baseDc = Number(foundation?.final?.saveDc ?? actorProfile.spellDc) || 0;
  const rows = [];
  if (total.initiative) rows.push({ key: "Initiative", before: "Current", after: `${total.initiative >= 0 ? "+" : ""}${total.initiative} bonus` });
  if (total.speed) rows.push({ key: "Speed", before: `${baseSpeed} ft`, after: `${baseSpeed + total.speed} ft` });
  if (total.ac) rows.push({ key: "Armor class", before: baseAc || "—", after: baseAc ? baseAc + total.ac : `+${total.ac}` });
  if (total.saves) rows.push({ key: "All saves", before: "Current", after: `+${total.saves} bonus` });
  if (total.weaponAttack) rows.push({ key: "Weapon attacks", before: `${baseAttack >= 0 ? "+" : ""}${baseAttack}`, after: `${baseAttack + total.weaponAttack >= 0 ? "+" : ""}${baseAttack + total.weaponAttack}` });
  if (total.spellAttack) rows.push({ key: "Spell attacks", before: baseSpellAttack ? `+${baseSpellAttack}` : "Current", after: baseSpellAttack ? `+${baseSpellAttack + total.spellAttack}` : `+${total.spellAttack} additional` });
  if (total.spellDc) rows.push({ key: "Spell save DC", before: baseDc ? `DC ${baseDc}` : "Current", after: baseDc ? `DC ${baseDc + total.spellDc}` : `+${total.spellDc} additional` });
  if (total.recovery.length) rows.push({ key: "Recovery", before: "None from boosts", after: total.recovery.join("; ") });
  if (total.actions.length) rows.push({ key: "Action economy", before: "Base", after: total.actions.join("; ") });
  if (total.notes.length) rows.push({ key: "Other", before: "—", after: total.notes.join("; ") });
  return { ...total, rows };
}

function activityActivation(entry) {
  const type = entry.activation?.type ?? "special";
  return { type, value: ["action", "bonus", "reaction"].includes(type) ? 1 : null, condition: entry.activation?.condition ?? "", override: true };
}

function buildActivity(entry, idFactory) {
  if (!entry.activation && !entry.healing) return null;
  const id = idFactory();
  const common = {
    _id: id, type: entry.healing ? "heal" : "utility", name: entry.displayName ?? entry.name, sort: 0,
    activation: activityActivation(entry),
    consumption: { targets: entry.uses?.max ? [{ type: "itemUses", value: "1", target: "" }] : [], scaling: { allowed: false }, spellSlot: false },
    description: { value: "", chatFlavor: "" },
    range: { units: entry.healing?.range ? "ft" : "self", value: entry.healing?.range ? String(entry.healing.range) : null, override: true },
    target: {
      template: { contiguous: false, units: "ft", type: "", stationary: false },
      affects: { choice: false, type: entry.healing?.target ?? "self", count: entry.healing?.target ? "1" : "" },
      override: true, prompt: true
    }
  };
  if (!entry.healing) return { id, data: common };
  const customFormula = entry.healing.formula ?? "";
  common.healing = {
    number: entry.healing.number ?? null, denomination: entry.healing.denomination ?? 0, bonus: entry.healing.bonus ?? "",
    types: [entry.healing.type ?? "healing"], custom: { enabled: Boolean(customFormula), formula: customFormula }, scaling: { number: 1 }, modifiers: []
  };
  return { id, data: common };
}

function buildEffect(entry, idFactory) {
  if (!entry.effect?.length) return null;
  const modern = entry.effect.map((change) => ({
    _id: idFactory(), key: change.key, value: String(change.value), priority: change.priority ?? 20,
    type: "add", phase: "initial", conditions: "{}", replacement: ""
  }));
  const legacy = entry.effect.map((change) => ({ key: change.key, value: String(change.value), mode: 2, priority: change.priority ?? 20 }));
  const data = {
    _id: idFactory(), name: entry.displayName ?? entry.name, img: entry.img ?? "icons/svg/aura.svg", type: "base", transfer: true, disabled: false,
    duration: {}, statuses: [], flags: { dae: { stackable: "noneName", showIcon: false, specialDuration: [] } }
  };
  const systemMajor = Number.parseInt(String(globalThis.game?.system?.version ?? "6").split(".")[0], 10);
  if (systemMajor >= 6) data.system = { changes: modern, conditions: "{}", magical: false, rider: { statuses: [] } };
  else data.changes = legacy;
  return data;
}

function itemUses(entry) {
  if (!entry.uses?.max) return { max: "", spent: 0, recovery: [] };
  const recovery = { period: entry.uses.period ?? "day", type: "recoverAll" };
  if (entry.uses.formula) recovery.formula = entry.uses.formula;
  return { max: String(entry.uses.max), spent: 0, recovery: [recovery] };
}

export function prepareBoostItemData(entry, { setId, idFactory = () => crypto.randomUUID().replaceAll("-", "").slice(0, 16), plan = null } = {}) {
  if (!entry?.id || !ENTRY_BY_ID.has(entry.id)) throw new Error("Built-in boost data is invalid.");
  const name = String(entry.displayName || entry.customName || entry.name).trim().slice(0, 80) || entry.name;
  const activity = buildActivity(entry, idFactory);
  const effect = buildEffect(entry, idFactory);
  const automation = AUTOMATION_LABELS[entry.automation] ?? entry.automation;
  const rawCr = String(plan?.foundation?.stats?.cr ?? plan?.config?.cr ?? "0");
  const cr = rawCr === "1/8" ? 0.125 : rawCr === "1/4" ? 0.25 : rawCr === "1/2" ? 0.5 : Number(rawCr) || 0;
  const casterLevel = entry.progression ? Math.max(1, Math.floor(cr * entry.progression)) : null;
  const progressionText = casterLevel
    ? `<p><strong>Effective caster level:</strong> ${casterLevel}. Add spells separately.</p>`
    : "";
  const activityHint = activity
    ? "<p>Use the generated activity for the roll or action prompt.</p>"
    : entry.automation === "manual" || entry.automation === "midi"
      ? `<p><em>${entry.automation === "midi" ? "Midi-QOL/DAE can assist where supported; " : ""}resolve conditional timing manually.</em></p>`
      : "";
  return {
    name, type: "feat", img: entry.img ?? "icons/svg/aura.svg",
    flags: {
      [MODULE_ID]: {
        generated: true, version: MODULE_VERSION, setId, kind: "boost", role: "boost",
        boostId: entry.id, boostGroup: entry.groupId, category: entry.categoryId, defaultName: entry.name,
        customName: entry.customName || "", power: entry.power, automation: entry.automation,
        exclusiveGroup: entry.exclusiveGroup, requirements: entry.requirements
      },
      dae: { stackable: "noneName" }
    },
    effects: effect ? [effect] : [],
    system: {
      description: {
        value: `<p><strong>[[lookup @name]].</strong> ${escapeHtml(entry.description)}</p>${progressionText}${activityHint}<p class="monster-forge-note">Monster Forge · ${escapeHtml(POWER_LABELS[entry.power] ?? entry.power)} power · ${escapeHtml(automation)}</p>`,
        chat: "", unidentified: ""
      },
      type: { value: "monster", subtype: "" }, identifier: entry.id.replaceAll(".", "-"), uses: itemUses(entry),
      activities: activity ? { [activity.id]: activity.data } : {}
    }
  };
}

/** Removed in 1.6: built-in boosts need no UUID resolution. */
export async function resolveBoostSources(entries = []) {
  return entries;
}
