export const MODULE_ID = "monster-forge";
export const MODULE_TITLE = "Monster Forge";
export const MODULE_VERSION = "1.4.0";

/**
 * Baseline statistics from the published Forge of Foes monster statistics
 * table. `publishedAttacks` preserves the book's attack count for comparison;
 * `recommendedAttacks` is Monster Forge's deliberately compressed workflow.
 */
export const FOF_STATS = Object.freeze({
  "0": { ac: 10, hp: 3, attackBonus: 2, saveDc: 10, dpr: 2, publishedAttacks: 1, recommendedAttacks: 1 },
  "1/8": { ac: 11, hp: 9, attackBonus: 3, saveDc: 11, dpr: 3, publishedAttacks: 1, recommendedAttacks: 1 },
  "1/4": { ac: 11, hp: 13, attackBonus: 3, saveDc: 11, dpr: 5, publishedAttacks: 1, recommendedAttacks: 1 },
  "1/2": { ac: 12, hp: 22, attackBonus: 4, saveDc: 12, dpr: 10, publishedAttacks: 1, recommendedAttacks: 1 },
  "1": { ac: 12, hp: 33, attackBonus: 5, saveDc: 12, dpr: 12, publishedAttacks: 2, recommendedAttacks: 2 },
  "2": { ac: 13, hp: 45, attackBonus: 5, saveDc: 13, dpr: 17, publishedAttacks: 2, recommendedAttacks: 2 },
  "3": { ac: 13, hp: 65, attackBonus: 5, saveDc: 13, dpr: 23, publishedAttacks: 2, recommendedAttacks: 2 },
  "4": { ac: 14, hp: 85, attackBonus: 6, saveDc: 14, dpr: 29, publishedAttacks: 2, recommendedAttacks: 2 },
  "5": { ac: 15, hp: 95, attackBonus: 7, saveDc: 15, dpr: 35, publishedAttacks: 3, recommendedAttacks: 3 },
  "6": { ac: 15, hp: 112, attackBonus: 7, saveDc: 15, dpr: 41, publishedAttacks: 3, recommendedAttacks: 3 },
  "7": { ac: 15, hp: 127, attackBonus: 7, saveDc: 15, dpr: 47, publishedAttacks: 3, recommendedAttacks: 3 },
  "8": { ac: 15, hp: 136, attackBonus: 7, saveDc: 15, dpr: 53, publishedAttacks: 3, recommendedAttacks: 3 },
  "9": { ac: 16, hp: 145, attackBonus: 8, saveDc: 16, dpr: 59, publishedAttacks: 3, recommendedAttacks: 3 },
  "10": { ac: 17, hp: 155, attackBonus: 9, saveDc: 17, dpr: 65, publishedAttacks: 4, recommendedAttacks: 3 },
  "11": { ac: 17, hp: 165, attackBonus: 9, saveDc: 17, dpr: 71, publishedAttacks: 4, recommendedAttacks: 3 },
  "12": { ac: 17, hp: 175, attackBonus: 9, saveDc: 17, dpr: 77, publishedAttacks: 4, recommendedAttacks: 3 },
  "13": { ac: 18, hp: 184, attackBonus: 10, saveDc: 18, dpr: 83, publishedAttacks: 4, recommendedAttacks: 3 },
  "14": { ac: 19, hp: 196, attackBonus: 11, saveDc: 19, dpr: 89, publishedAttacks: 4, recommendedAttacks: 3 },
  "15": { ac: 19, hp: 210, attackBonus: 11, saveDc: 19, dpr: 95, publishedAttacks: 5, recommendedAttacks: 3 },
  "16": { ac: 19, hp: 229, attackBonus: 11, saveDc: 19, dpr: 101, publishedAttacks: 5, recommendedAttacks: 3 },
  "17": { ac: 20, hp: 246, attackBonus: 12, saveDc: 20, dpr: 107, publishedAttacks: 5, recommendedAttacks: 3 },
  "18": { ac: 21, hp: 266, attackBonus: 13, saveDc: 21, dpr: 113, publishedAttacks: 5, recommendedAttacks: 3 },
  "19": { ac: 21, hp: 285, attackBonus: 13, saveDc: 21, dpr: 119, publishedAttacks: 5, recommendedAttacks: 3 },
  "20": { ac: 21, hp: 300, attackBonus: 13, saveDc: 21, dpr: 132, publishedAttacks: 5, recommendedAttacks: 3 },
  "21": { ac: 22, hp: 325, attackBonus: 14, saveDc: 22, dpr: 150, publishedAttacks: 5, recommendedAttacks: 3 },
  "22": { ac: 23, hp: 350, attackBonus: 15, saveDc: 23, dpr: 168, publishedAttacks: 5, recommendedAttacks: 3 },
  "23": { ac: 23, hp: 375, attackBonus: 15, saveDc: 23, dpr: 186, publishedAttacks: 5, recommendedAttacks: 3 },
  "24": { ac: 23, hp: 400, attackBonus: 15, saveDc: 23, dpr: 204, publishedAttacks: 5, recommendedAttacks: 3 },
  "25": { ac: 24, hp: 430, attackBonus: 16, saveDc: 24, dpr: 222, publishedAttacks: 5, recommendedAttacks: 3 },
  "26": { ac: 25, hp: 460, attackBonus: 17, saveDc: 25, dpr: 240, publishedAttacks: 5, recommendedAttacks: 4 },
  "27": { ac: 25, hp: 490, attackBonus: 17, saveDc: 25, dpr: 258, publishedAttacks: 5, recommendedAttacks: 4 },
  "28": { ac: 25, hp: 540, attackBonus: 17, saveDc: 25, dpr: 276, publishedAttacks: 5, recommendedAttacks: 4 },
  "29": { ac: 26, hp: 600, attackBonus: 18, saveDc: 26, dpr: 294, publishedAttacks: 5, recommendedAttacks: 4 },
  "30": { ac: 27, hp: 666, attackBonus: 19, saveDc: 27, dpr: 312, publishedAttacks: 5, recommendedAttacks: 4 }
});

export const CR_KEYS = Object.freeze([
  "0", "1/8", "1/4", "1/2",
  ...Array.from({ length: 30 }, (_value, index) => String(index + 1))
]);

export const DAMAGE_TYPES = Object.freeze([
  "acid",
  "bludgeoning",
  "cold",
  "fire",
  "force",
  "lightning",
  "necrotic",
  "piercing",
  "poison",
  "psychic",
  "radiant",
  "slashing",
  "thunder"
]);

export const ABILITIES = Object.freeze(["str", "dex", "con", "int", "wis", "cha"]);
export const DIE_SIZES = Object.freeze([4, 6, 8, 10, 12]);

/**
 * These are Monster Forge recommendations layered over the published Forge of
 * Foes row. They are intentionally data-only so the dialog can show every
 * adjustment before it changes an actor.
 */
export const COMBAT_ROLES = Object.freeze({
  balanced: {
    label: "Balanced",
    description: "No benchmark adjustment; a flexible all-rounder.",
    hpPct: 0,
    ac: 0,
    attackBonus: 0,
    saveDc: 0,
    dprPct: 0,
    speed: 0,
    attackAbility: "str",
    saveAbility: "wis",
    abilities: { str: 12, dex: 12, con: 12, int: 10, wis: 12, cha: 10 }
  },
  brute: {
    label: "Brute",
    description: "Hard-hitting and durable, but easier to hit and less accurate.",
    hpPct: 20,
    ac: -2,
    attackBonus: -1,
    saveDc: 0,
    dprPct: 10,
    speed: 0,
    attackAbility: "str",
    saveAbility: "con",
    abilities: { str: 16, dex: 8, con: 16, int: 8, wis: 10, cha: 8 }
  },
  soldier: {
    label: "Soldier",
    description: "Armored and accurate, trading health and damage for reliability.",
    hpPct: -15,
    ac: 2,
    attackBonus: 1,
    saveDc: 0,
    dprPct: -10,
    speed: 0,
    attackAbility: "str",
    saveAbility: "wis",
    abilities: { str: 14, dex: 12, con: 14, int: 10, wis: 12, cha: 10 }
  },
  skirmisher: {
    label: "Skirmisher",
    description: "Mobile and quick, with slightly lower durability.",
    hpPct: -10,
    ac: 0,
    attackBonus: 0,
    saveDc: 0,
    dprPct: 0,
    speed: 10,
    attackAbility: "dex",
    saveAbility: "dex",
    abilities: { str: 10, dex: 16, con: 12, int: 10, wis: 12, cha: 10 }
  },
  sniper: {
    label: "Sniper",
    description: "Accurate at range, but fragile when pinned down.",
    hpPct: -15,
    ac: -1,
    attackBonus: 1,
    saveDc: 0,
    dprPct: 0,
    speed: 0,
    attackAbility: "dex",
    saveAbility: "wis",
    abilities: { str: 8, dex: 16, con: 10, int: 12, wis: 14, cha: 10 }
  },
  controller: {
    label: "Controller",
    description: "Stronger save effects with less direct damage.",
    hpPct: 0,
    ac: 0,
    attackBonus: 0,
    saveDc: 1,
    dprPct: -15,
    speed: 0,
    attackAbility: "int",
    saveAbility: "int",
    castingMode: "save",
    abilities: { str: 8, dex: 12, con: 12, int: 16, wis: 14, cha: 12 }
  },
  support: {
    label: "Support",
    description: "Stays in the fight longer while spending less budget on damage.",
    hpPct: 10,
    ac: 0,
    attackBonus: 0,
    saveDc: 0,
    dprPct: -20,
    speed: 0,
    attackAbility: "wis",
    saveAbility: "wis",
    castingMode: "save",
    abilities: { str: 10, dex: 10, con: 14, int: 12, wis: 16, cha: 14 }
  },
  caster: {
    label: "Caster",
    description: "Potent spells and damage at the cost of defenses.",
    hpPct: -20,
    ac: -1,
    attackBonus: 1,
    saveDc: 1,
    dprPct: 10,
    speed: 0,
    attackAbility: "int",
    saveAbility: "int",
    castingMode: "both",
    abilities: { str: 8, dex: 12, con: 12, int: 16, wis: 14, cha: 14 }
  },
  leader: {
    label: "Leader",
    description: "Durable and commanding, with some damage shifted into allies.",
    hpPct: 10,
    ac: 0,
    attackBonus: 0,
    saveDc: 1,
    dprPct: -10,
    speed: 0,
    attackAbility: "cha",
    saveAbility: "cha",
    castingMode: "save",
    abilities: { str: 12, dex: 10, con: 14, int: 12, wis: 14, cha: 16 }
  }
});

export const CREATURE_TIERS = Object.freeze({
  minion: {
    label: "Minion",
    description: "25% hit points and 75% damage; action economy still needs GM judgment.",
    hpMultiplier: 0.25,
    dprMultiplier: 0.75
  },
  standard: {
    label: "Standard",
    description: "Uses the selected role without an additional tier multiplier.",
    hpMultiplier: 1,
    dprMultiplier: 1
  },
  elite: {
    label: "Elite",
    description: "150% hit points and 110% damage.",
    hpMultiplier: 1.5,
    dprMultiplier: 1.1
  },
  boss: {
    label: "Boss",
    description: "200% hit points and 120% damage; add action-economy features separately.",
    hpMultiplier: 2,
    dprMultiplier: 1.2
  }
});

/**
 * Species names mirror the campaign NPC generator. These presets recommend
 * body data and small 2014-style ability tendencies; they never imply culture
 * or faction membership.
 */
export const SPECIES_PROFILES = Object.freeze({
  preserve: { label: "Preserve actor", size: null, speed: null, darkvision: null, abilities: {} },
  human: { label: "Human", size: "med", speed: 30, darkvision: 0, abilities: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 } },
  halfElf: { label: "Half-Elf", size: "med", speed: 30, darkvision: 60, abilities: { dex: 1, wis: 1, cha: 2 } },
  dwarf: { label: "Dwarf", size: "med", speed: 25, darkvision: 60, abilities: { con: 2 } },
  halfling: { label: "Halfling", size: "sm", speed: 25, darkvision: 0, abilities: { dex: 2 } },
  gnome: { label: "Gnome", size: "sm", speed: 25, darkvision: 60, abilities: { int: 2 } },
  elf: { label: "Elf", size: "med", speed: 30, darkvision: 60, abilities: { dex: 2 } },
  tiefling: { label: "Tiefling", size: "med", speed: 30, darkvision: 60, abilities: { int: 1, cha: 2 } },
  halfOrc: { label: "Half-Orc", size: "med", speed: 30, darkvision: 60, abilities: { str: 2, con: 1 } },
  orc: { label: "Orc", size: "med", speed: 30, darkvision: 60, abilities: { str: 2, con: 1 } },
  goliath: { label: "Goliath", size: "med", speed: 30, darkvision: 0, abilities: { str: 2, con: 1 } },
  drow: { label: "Drow", size: "med", speed: 30, darkvision: 120, abilities: { dex: 2, cha: 1 } },
  duergar: { label: "Duergar", size: "med", speed: 25, darkvision: 120, abilities: { con: 2, str: 1 } },
  deepGnome: { label: "Deep Gnome", size: "sm", speed: 25, darkvision: 120, abilities: { int: 2, dex: 1 } }
});

export const ACTOR_SIZES = Object.freeze({
  tiny: "Tiny",
  sm: "Small",
  med: "Medium",
  lg: "Large",
  huge: "Huge",
  grg: "Gargantuan"
});

export const RIDERS = Object.freeze({
  none: "None",
  prone: "Knocked prone",
  grappled: "Grappled",
  poisoned: "Poisoned",
  restrained: "Restrained"
});

const melee = (overrides = {}) => ({
  rangeType: "melee",
  classification: "weapon",
  weaponType: "natural",
  properties: [],
  range: { value: 5, long: null, units: "ft" },
  ...overrides
});

const ranged = (overrides = {}) => ({
  rangeType: "ranged",
  classification: "weapon",
  properties: ["amm", "two"],
  ...overrides
});

const spellAttack = (overrides = {}) => ({
  rangeType: "ranged",
  classification: "spell",
  weaponType: "natural",
  properties: [],
  range: { value: 120, long: null, units: "ft" },
  ...overrides
});

export const WEAPONS = Object.freeze({
  dagger: melee({
    name: "Dagger",
    baseDice: 1,
    die: 4,
    damageType: "piercing",
    ability: "dex",
    weaponType: "simpleM",
    properties: ["fin", "lgt", "thr"],
    range: { value: 20, long: 60, units: "ft" },
    img: "icons/weapons/daggers/dagger-straight-blue.webp"
  }),
  shortsword: melee({
    name: "Shortsword",
    baseDice: 1,
    die: 6,
    damageType: "piercing",
    ability: "dex",
    weaponType: "martialM",
    properties: ["fin", "lgt"],
    img: "icons/weapons/swords/shortsword-guard-brown.webp"
  }),
  mace: melee({
    name: "Mace",
    baseDice: 1,
    die: 6,
    damageType: "bludgeoning",
    ability: "str",
    weaponType: "simpleM",
    img: "icons/weapons/maces/mace-round-spiked-black.webp"
  }),
  longsword: melee({
    name: "Longsword",
    baseDice: 1,
    die: 8,
    damageType: "slashing",
    ability: "str",
    weaponType: "martialM",
    properties: ["ver"],
    img: "icons/weapons/swords/sword-guard-steel-green.webp"
  }),
  greatsword: melee({
    name: "Greatsword",
    baseDice: 2,
    die: 6,
    damageType: "slashing",
    ability: "str",
    weaponType: "martialM",
    properties: ["hvy", "two"],
    img: "icons/weapons/swords/greatsword-guard-gold-worn.webp"
  }),
  shortbow: ranged({
    name: "Shortbow",
    baseDice: 1,
    die: 6,
    damageType: "piercing",
    ability: "dex",
    weaponType: "simpleR",
    range: { value: 80, long: 320, units: "ft" },
    img: "icons/weapons/bows/shortbow-recurve-yellow-blue.webp"
  }),
  longbow: ranged({
    name: "Longbow",
    baseDice: 1,
    die: 8,
    damageType: "piercing",
    ability: "dex",
    weaponType: "martialR",
    properties: ["amm", "hvy", "two"],
    range: { value: 150, long: 600, units: "ft" },
    img: "icons/weapons/bows/longbow-recurve-leather-red.webp"
  }),
  bite: melee({
    name: "Bite",
    baseDice: 1,
    die: 8,
    damageType: "piercing",
    ability: "str",
    img: "icons/creatures/abilities/mouth-teeth-human.webp"
  }),
  claw: melee({
    name: "Claws",
    baseDice: 1,
    die: 6,
    damageType: "slashing",
    ability: "str",
    img: "icons/creatures/claws/claw-curved-jagged-gray.webp"
  }),
  arcaneBolt: spellAttack({
    name: "Arcane Bolt",
    baseDice: 1,
    die: 8,
    damageType: "force",
    ability: "int",
    img: "icons/magic/light/projectile-beam-blue.webp"
  }),
  divineBolt: spellAttack({
    name: "Divine Bolt",
    baseDice: 1,
    die: 8,
    damageType: "radiant",
    ability: "wis",
    img: "icons/magic/holy/projectiles-blades-salvo-yellow.webp"
  }),
  occultBolt: spellAttack({
    name: "Occult Bolt",
    baseDice: 1,
    die: 10,
    damageType: "necrotic",
    ability: "cha",
    img: "icons/magic/unholy/projectile-missile-green.webp"
  }),
  karuiChopper: melee({
    name: "Karui Chopper",
    baseDice: 1,
    die: 12,
    damageType: "slashing",
    ability: "str",
    weaponType: "martialM",
    properties: ["hvy", "two"],
    img: "icons/weapons/axes/axe-battle-black.webp"
  }),
  oriathanHalberd: melee({
    name: "Oriathan Halberd",
    baseDice: 1,
    die: 10,
    damageType: "slashing",
    ability: "str",
    weaponType: "martialM",
    properties: ["hvy", "rch", "two"],
    range: { value: 10, long: null, units: "ft" },
    img: "icons/weapons/polearms/halberd-crescent-glowing.webp"
  }),
  ezomyteHammer: melee({
    name: "Ezomyte Warhammer",
    baseDice: 2,
    die: 8,
    damageType: "bludgeoning",
    ability: "str",
    weaponType: "martialM",
    properties: ["hvy", "two"],
    img: "icons/weapons/hammers/hammer-double-glowing-yellow.webp"
  }),
  marakethBow: ranged({
    name: "Maraketh Bow",
    baseDice: 1,
    die: 8,
    damageType: "piercing",
    ability: "dex",
    weaponType: "martialR",
    properties: ["amm", "hvy", "two"],
    range: { value: 150, long: 600, units: "ft" },
    img: "icons/weapons/bows/longbow-gold-pink.webp"
  })
});

export const DEFAULTS = Object.freeze({
  cr: "1",
  foundation: {
    mode: "apply",
    role: "balanced",
    species: "preserve",
    tier: "standard",
    castingAbility: "auto",
    hpPolicy: "ratio",
    manage: {
      hp: true,
      ac: true,
      abilities: true,
      body: true
    },
    overrides: {
      hp: "",
      ac: "",
      attackBonus: "",
      saveDc: "",
      dpr: "",
      speed: "",
      darkvision: "",
      size: "",
      abilities: { str: "", dex: "", con: "", int: "", wis: "", cha: "" }
    }
  },
  boosts: {
    selected: []
  },
  roleModifier: 0,
  followCrAttacks: true,
  accuracyMode: "actor",
  saveDcMode: "cr",
  riderAutomation: "midi",
  applyMode: "replace",
  splitPrimary: 60,
  secondaryEnabled: false,
  primary: {
    count: 1,
    weaponKey: "longsword",
    name: "",
    abilityOverride: "auto",
    extraType: "none",
    extraDie: 6,
    rider: "none",
    saveAbility: "str"
  },
  secondary: {
    count: 1,
    weaponKey: "shortbow",
    name: "",
    abilityOverride: "auto",
    extraType: "none",
    extraDie: 6,
    rider: "none",
    saveAbility: "str"
  },
  tertiary: {
    enabled: false,
    preset: "Poison",
    name: "",
    dice: 2,
    die: 6,
    damageType: "poison",
    usesPerRound: 1,
    saveAbility: "none",
    dcAbility: "con"
  }
});
