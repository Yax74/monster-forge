import test from "node:test";
import assert from "node:assert/strict";

import { CR_KEYS, FOF_STATS, MODULE_ID } from "../scripts/constants.js";
import {
  applyRecommendedAttacks,
  buildDamagePlan,
  getCrStats,
  normalizeConfig,
  normalizeCr,
  optimizeDice,
  suggestedAttackBonus,
  suggestedSaveDc,
  targetDpr
} from "../scripts/engine.js";
import { buildWeaponItem } from "../scripts/item-builder.js";
import {
  applyFoundationPlan,
  applyPlan,
  buildFoundationActorUpdate,
  getActorCombatProfile,
  getExistingOffensiveItems,
  getGeneratedItems,
  undoLastOperation
} from "../scripts/actor-service.js";
import {
  buildFoundationPlan,
  crProficiency,
  getEffectiveActorProfile,
  normalizeFoundationConfig
} from "../scripts/foundation.js";
import {
  buildBoostGroups,
  discoverBoostCatalog,
  normalizeBoostConfig,
  parseBoostVariant,
  prepareBoostItemData,
  resolveBoostSources,
  selectBoosts
} from "../scripts/boosts.js";
import { generatorSpecies } from "../scripts/app.js";

test("reads legacy NPC Generator species without requiring that module to be active", () => {
  const actor = {
    flags: {
      "wraeclast-npc-gen": {
        npc: { species: "Drow" }
      }
    },
    getFlag() {
      throw new Error("Flag scope is not valid or not currently active");
    }
  };

  assert.deepEqual(generatorSpecies(actor), { key: "drow", label: "Drow" });
  assert.equal(generatorSpecies({ flags: {} }), null);
});

test("normalizes fractional and numeric CR values", () => {
  assert.equal(normalizeCr("1/8"), "1/8");
  assert.equal(normalizeCr(0.125), "1/8");
  assert.equal(normalizeCr("0.25"), "1/4");
  assert.equal(normalizeCr(0.5), "1/2");
  assert.equal(normalizeCr(31), "30");
  assert.equal(normalizeCr("not-a-cr"), "0");
});

test("contains the complete published Forge of Foes DPR progression", () => {
  assert.equal(Object.keys(FOF_STATS).length, 34);
  assert.deepEqual(
    CR_KEYS.map((cr) => FOF_STATS[cr].dpr),
    [2, 3, 5, 10, 12, 17, 23, 29, 35, 41, 47, 53, 59, 65, 71, 77, 83, 89, 95, 101, 107, 113, 119, 132, 150, 168, 186, 204, 222, 240, 258, 276, 294, 312]
  );
  assert.deepEqual(
    CR_KEYS.map((cr) => FOF_STATS[cr].attackBonus),
    [2, 3, 3, 4, 5, 5, 5, 6, 7, 7, 7, 7, 8, 9, 9, 9, 10, 11, 11, 11, 12, 13, 13, 13, 14, 15, 15, 15, 16, 17, 17, 17, 18, 19]
  );
  assert.deepEqual(
    CR_KEYS.map((cr) => FOF_STATS[cr].saveDc),
    [10, 11, 11, 12, 12, 13, 13, 14, 15, 15, 15, 15, 16, 17, 17, 17, 18, 19, 19, 19, 20, 21, 21, 21, 22, 23, 23, 23, 24, 25, 25, 25, 26, 27]
  );
  assert.deepEqual(
    CR_KEYS.map((cr) => FOF_STATS[cr].publishedAttacks),
    [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]
  );
  assert.deepEqual(getCrStats(6), {
    cr: "6", ac: 15, hp: 112, attackBonus: 7, saveDc: 15, dpr: 41,
    publishedAttacks: 3, recommendedAttacks: 3
  });
  assert.deepEqual(getCrStats(30), {
    cr: "30", ac: 27, hp: 666, attackBonus: 19, saveDc: 27, dpr: 312,
    publishedAttacks: 5, recommendedAttacks: 4
  });
});

test("uses the FoF DPR baseline and applies the optional role modifier", () => {
  assert.equal(targetDpr(5, 0), 35);
  assert.equal(targetDpr(5, 20), 42);
  assert.equal(targetDpr(5, -10), 31.5);
});

test("matches the published FoF attack bonus and AC/DC values", () => {
  assert.equal(suggestedAttackBonus(0), 2);
  assert.equal(suggestedAttackBonus(2), 5);
  assert.equal(suggestedAttackBonus(4), 6);
  assert.equal(suggestedAttackBonus(16), 11);
  assert.equal(suggestedAttackBonus(30), 19);
  assert.equal(suggestedSaveDc(0), 10);
  assert.equal(suggestedSaveDc("1/2"), 12);
  assert.equal(suggestedSaveDc(17), 20);
  assert.equal(suggestedSaveDc(30), 27);
});

test("derives the standard proficiency bonus from CR", () => {
  assert.equal(crProficiency(0), 2);
  assert.equal(crProficiency(4), 2);
  assert.equal(crProficiency(5), 3);
  assert.equal(crProficiency(17), 6);
  assert.equal(crProficiency(30), 9);
});

test("layers transparent role, tier, and campaign species recommendations", () => {
  const foundation = buildFoundationPlan({
    cr: "5",
    foundation: { role: "brute", tier: "elite", species: "halfOrc" },
    primary: { weaponKey: "longsword", abilityOverride: "auto" }
  }, { speed: 30, darkvision: 0, size: "med" });

  assert.deepEqual(foundation.final, {
    hp: 171,
    ac: 13,
    attackBonus: 6,
    saveDc: 15,
    dpr: 42.5
  });
  assert.equal(foundation.proficiency, 3);
  assert.equal(foundation.abilities.str, 16);
  assert.equal(foundation.abilities.con, 18);
  assert.deepEqual(foundation.body, { size: "med", speed: 30, darkvision: 60 });
  assert.match(foundation.sources.baseline, /Forge of Foes CR 5/);
  assert.match(foundation.sources.role, /Monster Forge Brute/);
});

test("foundation overrides are bounded and feed attack planning", () => {
  const config = {
    cr: "5",
    roleModifier: 10,
    foundation: {
      mode: "apply",
      overrides: {
        hp: 200,
        attackBonus: 9,
        saveDc: 17,
        dpr: 50,
        abilities: { str: 22 }
      }
    },
    primary: { count: 3, weaponKey: "longsword", extraType: "none" }
  };
  const foundation = buildFoundationPlan(config);
  const profile = getEffectiveActorProfile(foundation, { abilityMods: { str: 1 }, proficiency: 2 });
  const damage = buildDamagePlan(
    { ...config, foundation: foundation.config },
    profile,
    foundation.final
  );

  assert.equal(foundation.final.hp, 200);
  assert.equal(foundation.final.attackBonus, 9);
  assert.equal(foundation.abilities.str, 22);
  assert.equal(damage.target, 55);
  assert.equal(damage.suggestedAttackBonus, 9);
  assert.equal(damage.suggestedSaveDc, 17);
  assert.equal(profile.proficiency, 3);
});

test("previews role-derived abilities separately from explicit overrides", () => {
  const caster = buildFoundationPlan({
    cr: "5",
    foundation: {
      role: "caster",
      castingAbility: "wis",
      overrides: { abilities: { str: 7 } }
    },
    primary: { weaponKey: "divineBolt", abilityOverride: "auto" }
  });

  assert.equal(caster.casting.enabled, true);
  assert.equal(caster.casting.ability, "wis");
  assert.equal(caster.casting.attackBonus, 8);
  assert.equal(caster.casting.saveDc, 16);
  assert.equal(caster.recommendedAbilities.wis, 20);
  assert.equal(caster.recommendedAbilities.str, 8);
  assert.equal(caster.abilities.str, 7);
  assert.equal(caster.abilities.wis, 20);

  const brute = buildFoundationPlan({
    cr: "5",
    foundation: { role: "brute", castingAbility: "auto" },
    primary: { weaponKey: "mace", abilityOverride: "auto" }
  });
  assert.notDeepEqual(caster.recommendedAbilities, brute.recommendedAbilities);
});

test("recalculates attributes when the role changes without changing the attack profile", () => {
  const common = {
    cr: "5",
    primary: { weaponKey: "longsword", abilityOverride: "auto" }
  };
  const brute = buildFoundationPlan({
    ...common,
    foundation: { role: "brute" }
  });
  const caster = buildFoundationPlan({
    ...common,
    foundation: { role: "caster", castingAbility: "cha" }
  });
  const support = buildFoundationPlan({
    ...common,
    foundation: { role: "support", castingAbility: "wis" }
  });

  assert.notDeepEqual(brute.recommendedAbilities, caster.recommendedAbilities);
  assert.equal(brute.recommendedAbilities.str, 16);
  assert.equal(caster.recommendedAbilities.str, 20);
  assert.equal(caster.recommendedAbilities.cha, 20);
  assert.equal(caster.casting.attackBonus, 8);
  assert.equal(caster.casting.saveDc, 16);
  assert.equal(support.casting.attackBonus, null);
  assert.equal(support.casting.saveDc, 15);
});

test("groups ranked compendium boosts and blocks foundation conflicts", () => {
  assert.deepEqual(parseBoostVariant("Tough III"), {
    family: "Tough", rank: 3, rankLabel: "Rank III", kind: "boost"
  });
  assert.equal(parseBoostVariant("NPC Full Caster").family, "Caster Progression");
  assert.deepEqual(normalizeBoostConfig({ selected: ["bad", "Compendium.test.boosts.Item.two", "Compendium.test.boosts.Item.two"] }), {
    selected: ["Compendium.test.boosts.Item.two"]
  });

  const entries = [
    { uuid: "Compendium.test.boosts.Item.one", packId: "test.boosts", packLabel: "Boosts", name: "Tough I", family: "Tough", rank: 1, rankLabel: "Rank I", kind: "boost", selectable: true, summary: "" },
    { uuid: "Compendium.test.boosts.Item.two", packId: "test.boosts", packLabel: "Boosts", name: "Tough II", family: "Tough", rank: 2, rankLabel: "Rank II", kind: "boost", selectable: true, summary: "" },
    { uuid: "Compendium.test.boosts.Item.three", packId: "test.boosts", packLabel: "Boosts", name: "Tough III", family: "Tough", rank: 3, rankLabel: "Rank III", kind: "boost", selectable: true, summary: "" },
    { uuid: "Compendium.test.boosts.Item.hp", packId: "test.boosts", packLabel: "Boosts", name: "NPC Hitpoints", family: "NPC Hitpoints", rank: null, rankLabel: null, kind: "boost", selectable: false, conflictReason: "Conflicts" }
  ];
  const grouped = buildBoostGroups({ entries }, ["Compendium.test.boosts.Item.two"]);
  assert.equal(grouped.groups.length, 1);
  assert.equal(grouped.groups[0].options.length, 3);
  assert.equal(grouped.groups[0].selectedValue, "Compendium.test.boosts.Item.two");
  assert.equal(grouped.blocked.length, 1);

  const selected = selectBoosts({ selected: ["Compendium.test.boosts.Item.two", "Compendium.test.boosts.Item.hp"] }, { entries, warnings: [] });
  assert.deepEqual(selected.selected.map((entry) => entry.name), ["Tough II"]);
  assert.equal(selected.warnings.length, 1);

  const duplicateRanks = selectBoosts({
    selected: ["Compendium.test.boosts.Item.one", "Compendium.test.boosts.Item.three"]
  }, { entries, warnings: [] });
  assert.deepEqual(duplicateRanks.selected.map((entry) => entry.name), ["Tough I"]);
  assert.match(duplicateRanks.warnings[0], /another rank/i);
});

test("discovers boost descendants, explicit flags, and caster progression across Item packs", async () => {
  const pack = {
    collection: "test.boosts",
    documentName: "Item",
    metadata: { label: "Test Boosts", type: "Item" },
    folders: new Map([
      ["root", { id: "root", name: " NPC Boosts ", folder: null }],
      ["child", { id: "child", name: "Mobility", folder: "root" }],
      ["other", { id: "other", name: "Other Features", folder: null }]
    ]),
    async getIndex() {
      return new Map([
        ["quick", { _id: "quick", name: "Quickness II", folder: "child", system: { description: { value: "<p>Fast.</p>" } } }],
        ["resist", { _id: "resist", name: "Explicit Resistance", folder: "other", flags: { [MODULE_ID]: { boost: true } } }],
        ["caster", { _id: "caster", name: "NPC Full Caster", folder: "other" }],
        ["hp", { _id: "hp", name: "NPC Hitpoints", folder: "root" }],
        ["ignored", { _id: "ignored", name: "Ordinary Feature", folder: "other" }]
      ]);
    }
  };
  const unavailable = {
    collection: "test.unavailable",
    documentName: "Item",
    metadata: { label: "Unavailable", type: "Item" },
    async getIndex() {
      throw new Error("permission denied");
    }
  };
  const nonItemPack = {
    collection: "test.actors",
    documentName: "Actor",
    metadata: { label: "Actors", type: "Actor" }
  };

  const catalog = await discoverBoostCatalog([pack, unavailable, nonItemPack]);
  assert.deepEqual(catalog.entries.map((entry) => entry.name).sort(), [
    "Explicit Resistance",
    "NPC Full Caster",
    "NPC Hitpoints",
    "Quickness II"
  ]);
  assert.equal(catalog.entries.find((entry) => entry.name === "Quickness II").uuid, "Compendium.test.boosts.Item.quick");
  assert.equal(catalog.entries.find((entry) => entry.name === "NPC Hitpoints").selectable, false);
  assert.match(catalog.warnings[0], /Unavailable could not be indexed: permission denied/);
});

test("resolves selected boosts as Item documents", async () => {
  const entries = [{ uuid: "Compendium.test.boosts.Item.quick", name: "Quickness II" }];
  const sources = await resolveBoostSources(entries, async (uuid) => ({
    documentName: "Item",
    toObject: () => ({ _id: "quick", name: "Quickness II", type: "feat", flags: { sourceUuid: uuid } })
  }));

  assert.equal(sources.length, 1);
  assert.equal(sources[0].uuid, entries[0].uuid);
  assert.equal(sources[0].data.name, "Quickness II");
});

test("prepares compendium boosts without discarding their automation", () => {
  const prepared = prepareBoostItemData({
    uuid: "Compendium.test.boosts.Item.quick",
    data: {
      _id: "quick",
      name: "Quickness II",
      type: "feat",
      flags: { dae: { stackable: "noneName" } },
      effects: [{ _id: "effect", transfer: true, system: { changes: [{ key: "system.attributes.init.bonus", value: "4" }] } }],
      system: { description: { value: "<p>Fast.</p>" } }
    }
  }, { setId: "set-one" });

  assert.equal(prepared._id, undefined);
  assert.equal(prepared.flags.dae.stackable, "noneName");
  assert.equal(prepared.flags[MODULE_ID].generated, true);
  assert.equal(prepared.flags[MODULE_ID].kind, "boost");
  assert.equal(prepared.flags[MODULE_ID].sourceUuid, "Compendium.test.boosts.Item.quick");
  assert.equal(prepared.effects[0].system.changes[0].key, "system.attributes.init.bonus");
});

test("audit mode keeps the live actor profile", () => {
  const foundation = buildFoundationPlan({ cr: "10", foundation: { mode: "audit" } });
  const actor = { abilityMods: { str: 2 }, proficiency: 2, hp: 12, ac: 11 };
  assert.equal(getEffectiveActorProfile(foundation, actor), actor);
  assert.equal(normalizeFoundationConfig({ mode: "invalid" }).mode, "apply");
});

test("uses the agreed compressed attack-count schedule", () => {
  assert.equal(getCrStats("1/2").recommendedAttacks, 1);
  assert.equal(getCrStats(1).recommendedAttacks, 2);
  assert.equal(getCrStats(5).recommendedAttacks, 3);
  assert.equal(getCrStats(25).recommendedAttacks, 3);
  assert.equal(getCrStats(26).recommendedAttacks, 4);
  assert.equal(getCrStats(30).recommendedAttacks, 4);
  assert.equal(getCrStats(15).publishedAttacks, 5);
});

test("recommended counts preserve one or two attack profiles", () => {
  const single = applyRecommendedAttacks({ cr: "5", secondaryEnabled: false });
  assert.equal(single.secondaryEnabled, false);
  assert.equal(single.primary.count, 3);

  const dual = applyRecommendedAttacks({ cr: "5", secondaryEnabled: true, splitPrimary: 60 });
  assert.equal(dual.secondaryEnabled, true);
  assert.equal(dual.primary.count, 2);
  assert.equal(dual.secondary.count, 1);

  const fractional = applyRecommendedAttacks({ cr: "1/2", secondaryEnabled: true });
  assert.equal(fractional.secondaryEnabled, false);
  assert.equal(fractional.primary.count, 1);
});

test("normalizes stale or invalid saved form values", () => {
  const config = normalizeConfig({
    cr: "999",
    budgetPoint: "high",
    roleModifier: "not-a-number",
    splitPrimary: 500,
    primary: {
      count: 999,
      weaponKey: "missing",
      extraType: "chaos",
      extraDie: 20,
      rider: "stunned",
      saveAbility: "luck"
    },
    tertiary: { dice: 0, die: 20, usesPerRound: 99, damageType: "chaos" }
  });

  assert.equal(config.cr, "30");
  assert.equal(config.budgetPoint, undefined);
  assert.equal(config.roleModifier, 0);
  assert.equal(config.followCrAttacks, true);
  assert.equal(config.riderAutomation, "midi");
  assert.equal(config.foundation.mode, "apply");
  assert.equal(config.foundation.role, "balanced");
  assert.equal(config.foundation.manage.hp, true);
  assert.equal(config.foundation.overrides.abilities.str, "");
  assert.equal(config.splitPrimary, 95);
  assert.equal(config.primary.count, 20);
  assert.equal(config.primary.weaponKey, "longsword");
  assert.equal(config.primary.extraType, "none");
  assert.equal(config.primary.extraDie, 6);
  assert.equal(config.primary.rider, "none");
  assert.equal(config.primary.saveAbility, "str");
  assert.equal(config.tertiary.dice, 1);
  assert.equal(config.tertiary.die, 6);
  assert.equal(config.tertiary.usesPerRound, 20);
  assert.equal(config.tertiary.damageType, "poison");
});

test("ability overrides drive exact actor attack bonuses and save DCs", () => {
  const plan = buildDamagePlan({
    cr: "5",
    accuracyMode: "actor",
    saveDcMode: "actor",
    secondaryEnabled: false,
    primary: {
      count: 3,
      weaponKey: "longsword",
      abilityOverride: "dex",
      rider: "prone",
      saveAbility: "str"
    }
  }, {
    abilityMods: { str: 4, dex: 3 },
    proficiency: 3
  });

  assert.equal(plan.primary.weapon.ability, "dex");
  assert.equal(plan.primary.attackBonus, 6);
  assert.equal(plan.primary.riderSaveDc, 14);
  assert.equal(plan.primary.formula.includes("@abilities.dex.mod"), true);
});

test("dice optimizer preserves selected extra damage", () => {
  const dice = optimizeDice({
    targetAverage: 8,
    baseDie: 8,
    preferredBaseDice: 1,
    extraDie: 6,
    useExtra: true
  });
  assert.deepEqual(dice, { baseDice: 1, extraDice: 1, average: 8, error: 0 });
});

test("builds a close CR 5 damage plan using actor modifiers", () => {
  const plan = buildDamagePlan({
    cr: "5",
    secondaryEnabled: false,
    primary: { count: 2, weaponKey: "longsword", extraType: "none" }
  }, { str: 4 });

  assert.equal(plan.target, 35);
  assert.equal(plan.primary.formula, "3d8 + @abilities.str.mod");
  assert.equal(plan.achieved, 35);
  assert.equal(plan.variance, 0);
});

test("reports when tertiary damage exceeds the entire target", () => {
  const plan = buildDamagePlan({
    cr: "1/4",
    secondaryEnabled: false,
    primary: { count: 1, weaponKey: "dagger", extraType: "none" },
    tertiary: { enabled: true, dice: 4, die: 6, usesPerRound: 1, damageType: "poison" }
  }, { dex: 2 });
  assert.ok(plan.warnings.some((warning) => warning.includes("tertiary feature alone")));
});

test("builds D&D5e attack activities with modern type fields and module flags", () => {
  const plan = buildDamagePlan({
    cr: "2",
    accuracyMode: "cr",
    secondaryEnabled: false,
    primary: { count: 2, weaponKey: "longbow", extraType: "fire", extraDie: 6 }
  }, { dex: 3 });
  let index = 0;
  const item = buildWeaponItem(plan.primary, plan, {
    setId: "set-id",
    role: "primary",
    idFactory: () => `id-${++index}`
  });
  const activity = Object.values(item.system.activities).find((entry) => entry.type === "attack");

  assert.equal(item.flags[MODULE_ID].generated, true);
  assert.deepEqual(activity.attack.type, { value: "ranged", classification: "weapon" });
  assert.equal(activity.attack.flat, true);
  assert.equal(activity.attack.bonus, "5");
  assert.equal(activity.damage.includeBase, true);
  assert.ok(activity.damage.parts.length >= 1);
  assert.match(item.system.description.value, /\[\[\/attack extended\]\]/);
  assert.match(item.system.description.value, /\[\[\/damage extended\]\]/);
});

test("builds optional Midi-QOL rider chaining and a native condition effect", () => {
  const plan = buildDamagePlan({
    cr: "5",
    accuracyMode: "actor",
    saveDcMode: "actor",
    riderAutomation: "midi",
    secondaryEnabled: false,
    primary: { count: 3, weaponKey: "longsword", rider: "prone", saveAbility: "str" }
  }, { abilityMods: { str: 4 }, proficiency: 3 });
  let index = 0;
  const item = buildWeaponItem(plan.primary, plan, {
    setId: "set-id",
    role: "primary",
    idFactory: () => `id-${++index}`
  });
  const activities = Object.values(item.system.activities);
  const attack = activities.find((entry) => entry.type === "attack");
  const save = activities.find((entry) => entry.type === "save");

  assert.equal(item.effects.length, 1);
  assert.deepEqual(item.effects[0].statuses, ["prone"]);
  assert.equal(attack.midiProperties.triggeredActivityId, save._id);
  assert.equal(attack.midiProperties.triggeredActivityTargets, "hitTargets");
  assert.deepEqual(save.effects, [{ _id: item.effects[0]._id, onSave: false }]);
  assert.deepEqual(save.appliedEffects, [item.effects[0]._id]);
  assert.ok(item.system.description.value.includes(`[[/save activity=${save._id} format=long]]`));
  assert.match(item.system.description.value, /&Reference\[condition=prone\]/);

  const manualPlan = buildDamagePlan({
    ...plan.config,
    riderAutomation: "manual"
  }, { abilityMods: { str: 4 }, proficiency: 3 });
  index = 0;
  const manualItem = buildWeaponItem(manualPlan.primary, manualPlan, {
    setId: "manual-set",
    role: "primary",
    idFactory: () => `manual-${++index}`
  });
  const manualAttack = Object.values(manualItem.system.activities).find((entry) => entry.type === "attack");
  const manualSave = Object.values(manualItem.system.activities).find((entry) => entry.type === "save");
  assert.equal(manualItem.effects.length, 1);
  assert.deepEqual(manualSave.effects, [{ _id: manualItem.effects[0]._id, onSave: false }]);
  assert.equal(manualAttack.midiProperties, undefined);
});

test("extracts actor audit stats and excludes generated items from existing offense", () => {
  class ItemCollection extends Map {
    filter(predicate) {
      return [...this.values()].filter(predicate);
    }
  }

  const actor = {
    system: {
      abilities: { str: { mod: 4 }, dex: { mod: 2 } },
      attributes: { prof: 3, hp: { value: 40, max: 55 }, ac: { value: 16 }, spelldc: 15 }
    },
    items: new ItemCollection()
  };
  actor.items.set("manual", {
    name: "Manual Claw",
    type: "weapon",
    system: { activities: { attack: { type: "attack" } } },
    getFlag: () => false
  });
  actor.items.set("utility", {
    name: "Utility",
    type: "feat",
    system: { activities: { utility: { type: "utility" } } },
    getFlag: () => false
  });
  actor.items.set("generated", {
    name: "Generated Bite",
    type: "weapon",
    system: { activities: { attack: { type: "attack" } } },
    getFlag: (scope, key) => scope === MODULE_ID && key === "generated"
  });

  assert.deepEqual(getActorCombatProfile(actor), {
    abilityMods: { str: 4, dex: 2 },
    abilityScores: { str: 10, dex: 10 },
    proficiency: 3,
    cr: 0,
    hpValue: 40,
    hp: 55,
    ac: 16,
    spellDc: 15,
    speed: 0,
    darkvision: 0,
    size: null
  });
  assert.deepEqual(getExistingOffensiveItems(actor).map((item) => item.name), ["Manual Claw"]);
});

test("builds D&D5e 6 actor updates and preserves current HP percentage", () => {
  const actor = {
    system: {
      details: { cr: 2 },
      abilities: Object.fromEntries(["str", "dex", "con", "int", "wis", "cha"].map((ability) => [ability, { value: 10 }])),
      attributes: {
        hp: { value: 20, max: 40 },
        ac: { value: 13, override: null },
        movement: { speeds: { walk: 30 } },
        senses: { ranges: { darkvision: 0 } }
      },
      traits: { size: "med" }
    }
  };
  const foundation = buildFoundationPlan({
    cr: "5",
    foundation: { role: "skirmisher", species: "drow", tier: "standard" },
    primary: { weaponKey: "longbow", abilityOverride: "auto" }
  }, getActorCombatProfile(actor));
  const update = buildFoundationActorUpdate(actor, foundation);

  assert.equal(update["system.details.cr"], 5);
  assert.equal(update["system.attributes.hp.max"], 86);
  assert.equal(update["system.attributes.hp.value"], 43);
  assert.equal(update["system.attributes.ac.override"], 15);
  assert.equal(update["system.abilities.dex.value"], 18);
  assert.equal(update["system.traits.size"], "med");
  assert.equal(update["system.attributes.movement.speeds.walk"], 40);
  assert.equal(update["system.attributes.senses.ranges.darkvision"], 120);
});

test("builds legacy D&D5e 5 actor paths when nested v6 fields are absent", () => {
  const actor = {
    system: {
      details: { cr: { value: 2 } },
      abilities: Object.fromEntries(["str", "dex", "con", "int", "wis", "cha"].map((ability) => [ability, { value: 10 }])),
      attributes: {
        hp: { value: 40, max: 40 },
        ac: { value: 13, calc: "default", flat: 13 },
        movement: { walk: 30 },
        senses: { darkvision: 0 }
      },
      traits: { size: "med" }
    }
  };
  const foundation = buildFoundationPlan({
    cr: "5",
    foundation: { species: "dwarf" },
    primary: { weaponKey: "mace", abilityOverride: "auto" }
  }, getActorCombatProfile(actor));
  const update = buildFoundationActorUpdate(actor, foundation);

  assert.equal(update["system.details.cr.value"], 5);
  assert.equal(update["system.attributes.ac.calc"], "natural");
  assert.equal(update["system.attributes.ac.flat"], 15);
  assert.equal(update["system.attributes.movement.walk"], 25);
  assert.equal(update["system.attributes.senses.darkvision"], 60);
});

test("replace and undo touch only generated items", async () => {
  let generatedId = 0;
  globalThis.foundry = {
    utils: {
      deepClone: structuredClone,
      randomID: () => `generated-${++generatedId}`
    }
  };

  class ItemCollection extends Map {
    filter(predicate) {
      return [...this.values()].filter(predicate);
    }
  }

  const wrapItem = (source, actor) => ({
    id: source._id,
    name: source.name,
    uuid: `Actor.mock.Item.${source._id}`,
    getFlag: (scope, key) => source.flags?.[scope]?.[key],
    toObject: () => structuredClone(source),
    actor
  });

  const actor = {
    name: "Test NPC",
    type: "npc",
    isOwner: true,
    system: { abilities: { str: { mod: 3 }, dex: { mod: 2 } } },
    items: new ItemCollection(),
    flags: {},
    getFlag(scope, key) {
      return this.flags?.[scope]?.[key];
    },
    async setFlag(scope, key, value) {
      this.flags[scope] ??= {};
      this.flags[scope][key] = structuredClone(value);
    },
    async unsetFlag(scope, key) {
      if (this.flags[scope]) delete this.flags[scope][key];
    },
    async createEmbeddedDocuments(_type, data, options = {}) {
      return data.map((raw) => {
        const source = structuredClone(raw);
        source._id = options.keepId && source._id ? source._id : `item-${++generatedId}`;
        const item = wrapItem(source, this);
        this.items.set(item.id, item);
        return item;
      });
    },
    async deleteEmbeddedDocuments(_type, ids) {
      for (const id of ids) this.items.delete(id);
    }
  };

  const userSource = { _id: "user-item", name: "User Feature", flags: {} };
  const oldSource = {
    _id: "old-forge",
    name: "Old Forge Attack",
    flags: { [MODULE_ID]: { generated: true } }
  };
  actor.items.set(userSource._id, wrapItem(userSource, actor));
  actor.items.set(oldSource._id, wrapItem(oldSource, actor));
  const legacyOperation = { originalItemsData: [], generatedItemIds: ["old-forge"] };
  actor.flags.world = { monsterForgeData: structuredClone(legacyOperation) };

  const plan = buildDamagePlan({
    cr: "2",
    secondaryEnabled: false,
    applyMode: "replace",
    primary: { count: 2, weaponKey: "longsword", extraType: "none" }
  }, { str: 3 });

  const applied = await applyPlan(actor, plan, {
    boostSources: [{
      uuid: "Compendium.test.boosts.Item.quick",
      data: {
        _id: "source-boost",
        name: "Quickness II",
        type: "feat",
        flags: {},
        effects: [{ _id: "quick-effect", transfer: true, system: { changes: [] } }],
        system: { description: { value: "<p>Initiative boost.</p>" } }
      }
    }]
  });
  assert.equal(applied.replaced, 1);
  assert.equal(applied.boosts, 1);
  assert.ok(actor.items.has("user-item"));
  assert.equal(actor.items.has("old-forge"), false);
  assert.equal(getGeneratedItems(actor).length, 3);
  assert.ok(getGeneratedItems(actor).some((item) => item.name === "Quickness II"));
  assert.equal(actor.getFlag("world", "monsterForgeData"), undefined);

  const undone = await undoLastOperation(actor);
  assert.equal(undone.undone, true);
  assert.ok(actor.items.has("user-item"));
  assert.ok(actor.items.has("old-forge"));
  assert.equal(getGeneratedItems(actor).length, 1);
  assert.deepEqual(actor.getFlag("world", "monsterForgeData"), legacyOperation);

  const appendPlan = buildDamagePlan({
    cr: "2",
    secondaryEnabled: false,
    applyMode: "append",
    primary: { count: 2, weaponKey: "mace", extraType: "none" }
  }, { str: 3 });
  await applyPlan(actor, appendPlan);
  assert.deepEqual(actor.getFlag("world", "monsterForgeData"), legacyOperation);
  assert.ok(actor.items.has("old-forge"));

  await undoLastOperation(actor);
  assert.deepEqual(actor.getFlag("world", "monsterForgeData"), legacyOperation);
  assert.ok(actor.items.has("old-forge"));
  assert.equal(getGeneratedItems(actor).length, 1);
});

test("foundation application and undo restore actor data as one transaction", async () => {
  let generatedId = 0;
  globalThis.foundry = {
    utils: {
      deepClone: structuredClone,
      randomID: () => `foundation-${++generatedId}`
    }
  };

  class ItemCollection extends Map {
    filter(predicate) {
      return [...this.values()].filter(predicate);
    }
  }

  const setPath = (object, path, value) => {
    const parts = path.split(".");
    const deletePart = parts.at(-1);
    if (deletePart.startsWith("-=")) {
      parts.pop();
      const parent = parts.reduce((entry, key) => entry[key], object);
      delete parent[deletePart.slice(2)];
      return;
    }
    const key = parts.pop();
    const parent = parts.reduce((entry, part) => (entry[part] ??= {}), object);
    parent[key] = structuredClone(value);
  };
  const wrapItem = (source, actor) => ({
    id: source._id,
    name: source.name,
    uuid: `Actor.foundation.Item.${source._id}`,
    getFlag: (scope, key) => source.flags?.[scope]?.[key],
    toObject: () => structuredClone(source),
    actor
  });
  const originalSystem = {
    details: { cr: 2 },
    abilities: Object.fromEntries(["str", "dex", "con", "int", "wis", "cha"].map((ability) => [ability, { value: 10, mod: 0 }])),
    attributes: {
      prof: 2,
      hp: { value: 20, max: 40 },
      ac: { value: 13, override: null },
      movement: { speeds: { walk: 30 } },
      senses: { ranges: { darkvision: 0 } }
    },
    traits: { size: "med" }
  };
  const actor = {
    name: "Foundation NPC",
    type: "npc",
    isOwner: true,
    system: structuredClone(originalSystem),
    items: new ItemCollection(),
    flags: {},
    toObject() {
      return { system: structuredClone(this.system), flags: structuredClone(this.flags) };
    },
    getFlag(scope, key) {
      return this.flags?.[scope]?.[key];
    },
    async setFlag(scope, key, value) {
      this.flags[scope] ??= {};
      this.flags[scope][key] = structuredClone(value);
    },
    async unsetFlag(scope, key) {
      if (this.flags[scope]) delete this.flags[scope][key];
    },
    async update(changes) {
      for (const [path, value] of Object.entries(changes)) setPath(this, path, value);
    },
    async createEmbeddedDocuments(_type, data, options = {}) {
      return data.map((raw) => {
        const source = structuredClone(raw);
        source._id = options.keepId && source._id ? source._id : `item-${++generatedId}`;
        const item = wrapItem(source, this);
        this.items.set(item.id, item);
        return item;
      });
    },
    async deleteEmbeddedDocuments(_type, ids) {
      for (const id of ids) this.items.delete(id);
    }
  };

  const config = {
    cr: "5",
    foundation: { mode: "apply", role: "brute", tier: "standard", species: "human" },
    primary: { count: 3, weaponKey: "longsword", extraType: "none" }
  };
  const actorProfile = getActorCombatProfile(actor);
  const foundation = buildFoundationPlan(config, actorProfile);
  const plan = buildDamagePlan(config, getEffectiveActorProfile(foundation, actorProfile), foundation.final);
  plan.foundation = foundation;

  const applied = await applyPlan(actor, plan);
  assert.equal(applied.actorUpdated, true);
  assert.equal(actor.system.details.cr, 5);
  assert.equal(actor.system.attributes.hp.max, 114);
  assert.equal(actor.system.attributes.hp.value, 57);
  assert.equal(actor.system.attributes.ac.override, 13);
  assert.equal(actor.getFlag(MODULE_ID, "foundation").final.hp, 114);

  const undone = await undoLastOperation(actor);
  assert.equal(undone.actorRestored, true);
  assert.deepEqual(actor.system, originalSystem);
  assert.equal(actor.getFlag(MODULE_ID, "foundation"), undefined);
  assert.equal(getGeneratedItems(actor).length, 0);

  const foundationOnly = await applyFoundationPlan(actor, foundation);
  assert.equal(foundationOnly.actorUpdated, true);
  assert.equal(actor.system.details.cr, 5);
  assert.equal(getGeneratedItems(actor).length, 0);
  const foundationUndo = await undoLastOperation(actor);
  assert.equal(foundationUndo.actorRestored, true);
  assert.deepEqual(actor.system, originalSystem);
});
