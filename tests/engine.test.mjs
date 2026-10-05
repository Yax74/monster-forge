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
  applyPlan,
  getActorCombatProfile,
  getExistingOffensiveItems,
  getGeneratedItems,
  undoLastOperation
} from "../scripts/actor-service.js";

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
    proficiency: 3,
    hp: 55,
    ac: 16,
    spellDc: 15
  });
  assert.deepEqual(getExistingOffensiveItems(actor).map((item) => item.name), ["Manual Claw"]);
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

  const applied = await applyPlan(actor, plan);
  assert.equal(applied.replaced, 1);
  assert.ok(actor.items.has("user-item"));
  assert.equal(actor.items.has("old-forge"), false);
  assert.equal(getGeneratedItems(actor).length, 2);
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
