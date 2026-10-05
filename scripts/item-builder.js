import { MODULE_ID, MODULE_VERSION, RIDERS } from "./constants.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function damagePart(number, denomination, type, idFactory) {
  return {
    _id: idFactory(),
    number,
    denomination,
    bonus: "",
    types: [type],
    custom: { enabled: false, formula: "" },
    scaling: { mode: "", number: 1, formula: "" }
  };
}

function activityActivation(type, condition = "") {
  return { type, value: type === "action" ? 1 : null, condition, override: true };
}

function saveDc(plan, ability) {
  if (plan.config.saveDcMode === "cr") {
    return { calculation: "", formula: String(plan.suggestedSaveDc) };
  }
  return { calculation: ability, formula: "" };
}

function moduleFlags(setId, kind, role) {
  return {
    [MODULE_ID]: {
      generated: true,
      version: MODULE_VERSION,
      setId,
      kind,
      role
    }
  };
}

function buildAttackActivity(attack, plan, idFactory, triggeredActivityId = null) {
  const id = idFactory();
  const extraParts = attack.dice.extraDice > 0 && attack.extraType !== "none"
    ? [damagePart(attack.dice.extraDice, Number(attack.extraDie), attack.extraType, idFactory)]
    : [];
  const useFlatBonus = plan.config.accuracyMode === "cr";

  const data = {
    _id: id,
    type: "attack",
    name: "Attack",
    sort: 0,
    activation: activityActivation("action"),
    attack: {
      ability: attack.weapon.ability,
      bonus: useFlatBonus ? String(plan.suggestedAttackBonus) : "",
      critical: { threshold: null },
      flat: useFlatBonus,
      type: {
        value: attack.weapon.rangeType,
        classification: attack.weapon.classification
      }
    },
    damage: {
      critical: { bonus: "" },
      includeBase: true,
      parts: extraParts
    }
  };

  if (triggeredActivityId) {
    data.midiProperties = {
      triggeredActivityId,
      triggeredActivityConditionText: "",
      triggeredActivityTargets: "hitTargets",
      triggeredActivityRollAs: "self",
      triggeredActivityConsume: false,
      triggeredActivityConfigure: false
    };
  }

  return {
    id,
    data
  };
}

function buildRiderActivity(attack, plan, idFactory, effectId = null) {
  if (!attack.rider || attack.rider === "none") return null;
  const id = idFactory();
  const effects = effectId ? [{ _id: effectId, onSave: false }] : [];
  return {
    id,
    data: {
      _id: id,
      type: "save",
      name: `${RIDERS[attack.rider] ?? attack.rider} Save`,
      sort: 10,
      activation: activityActivation("special", `After ${attack.weapon.name} hits`),
      effects,
      appliedEffects: effectId ? [effectId] : [],
      save: {
        ability: [attack.saveAbility],
        dc: saveDc(plan, attack.weapon.ability)
      },
      damage: { onSave: "none", parts: [] }
    }
  };
}

function buildRiderEffect(attack, effectId) {
  const label = RIDERS[attack.rider] ?? attack.rider;
  return {
    _id: effectId,
    name: label,
    img: `systems/dnd5e/icons/svg/statuses/${attack.rider}.svg`,
    type: "base",
    system: { changes: [] },
    changes: [],
    disabled: false,
    duration: {
      startTime: null,
      seconds: null,
      combat: null,
      rounds: null,
      turns: null,
      startRound: null,
      startTurn: null
    },
    description: `<p>Applied by ${escapeHtml(attack.weapon.name)} after a failed ${attack.saveAbility.toUpperCase()} saving throw. Remove the condition when its rules allow.</p>`,
    transfer: false,
    statuses: [attack.rider],
    flags: {}
  };
}

export function buildWeaponItem(attack, plan, { idFactory, setId, role }) {
  const automateRider = plan.config.riderAutomation === "midi" && attack.rider !== "none";
  const effectId = attack.rider !== "none" ? idFactory() : null;
  const riderActivity = buildRiderActivity(attack, plan, idFactory, effectId);
  const attackActivity = buildAttackActivity(attack, plan, idFactory, automateRider ? riderActivity?.id : null);
  const activities = { [attackActivity.id]: attackActivity.data };
  if (riderActivity) activities[riderActivity.id] = riderActivity.data;
  const effects = effectId ? [buildRiderEffect(attack, effectId)] : [];

  const riderText = riderActivity
    ? `<p><strong>Rider.</strong> On a hit, the target must succeed on a [[/save activity=${riderActivity.id} format=long]] or be &Reference[condition=${attack.rider}].</p>`
    : "";

  return {
    name: attack.weapon.name,
    type: "weapon",
    img: attack.weapon.img,
    flags: moduleFlags(setId, "attack", role),
    effects,
    system: {
      description: {
        value: `<p>[[/attack extended]]. [[/damage extended]]</p>${riderText}`,
        chat: "",
        unidentified: ""
      },
      type: { value: attack.weapon.weaponType, baseItem: "" },
      properties: attack.weapon.properties,
      range: {
        value: attack.weapon.range.value ?? null,
        long: attack.weapon.range.long ?? null,
        reach: attack.weapon.rangeType === "melee" ? attack.weapon.range.value ?? 5 : null,
        units: attack.weapon.range.units ?? "ft"
      },
      equipped: true,
      proficiency: { multiplier: 1 },
      damage: {
        base: {
          number: attack.dice.baseDice,
          denomination: attack.weapon.die,
          bonus: "",
          types: [attack.weapon.damageType],
          custom: { enabled: false, formula: "" },
          scaling: { mode: "", number: 1, formula: "" }
        }
      },
      activities
    }
  };
}

export function buildTertiaryItem(plan, { idFactory, setId }) {
  const tertiary = plan.config.tertiary;
  if (!tertiary.enabled) return null;
  const id = idFactory();
  const name = tertiary.name?.trim()
    || (tertiary.preset === "custom" ? "Special Damage" : tertiary.preset);
  const damage = damagePart(tertiary.dice, tertiary.die, tertiary.damageType, idFactory);
  const hasSave = tertiary.saveAbility !== "none";
  const activity = {
    _id: id,
    type: hasSave ? "save" : "damage",
    name,
    sort: 0,
    activation: activityActivation("special", "After a successful hit"),
    consumption: { targets: [{ type: "itemUses", value: "1", target: "" }] },
    damage: hasSave
      ? { onSave: "none", parts: [damage] }
      : { critical: { allow: false, bonus: "" }, parts: [damage] }
  };
  if (hasSave) {
    activity.save = {
      ability: [tertiary.saveAbility],
      dc: saveDc(plan, tertiary.dcAbility)
    };
  }

  const description = hasSave
    ? `<p>After it hits with an attack, the creature can use this feature. The target must make a [[/save activity=${id} format=long]]. On a failed save, it takes [[/damage activity=${id} format=long]].</p>`
    : `<p>After it hits with an attack, the creature can deal [[/damage activity=${id} format=long]].</p>`;

  return {
    name,
    type: "feat",
    img: "icons/magic/death/projectile-skull-flaming-green.webp",
    flags: moduleFlags(setId, "tertiary", "tertiary"),
    system: {
      description: {
        value: description,
        chat: "",
        unidentified: ""
      },
      type: { value: "monster" },
      uses: {
        spent: 0,
        max: String(tertiary.usesPerRound),
        recovery: [{ period: "turnStart", type: "recoverAll" }]
      },
      activities: { [id]: activity }
    }
  };
}

export function buildMultiattackItem(plan, createdWeapons, { idFactory, setId }) {
  const id = idFactory();
  const primary = createdWeapons[0];
  const secondary = createdWeapons[1];
  let sentence = `The creature makes ${plan.primary.count} @UUID[${primary.uuid}]{${escapeHtml(primary.name)}} attack${plan.primary.count === 1 ? "" : "s"}`;
  if (secondary) {
    sentence += ` and ${plan.secondary.count} @UUID[${secondary.uuid}]{${escapeHtml(secondary.name)}} attack${plan.secondary.count === 1 ? "" : "s"}`;
  }
  sentence += ".";

  if (plan.config.tertiary.enabled) {
    const tertiaryName = plan.config.tertiary.name?.trim()
      || (plan.config.tertiary.preset === "custom" ? "Special Damage" : plan.config.tertiary.preset);
    sentence += ` It can also use ${escapeHtml(tertiaryName)} up to ${plan.config.tertiary.usesPerRound} time(s) during those attacks.`;
  }

  return {
    name: "Multiattack",
    type: "feat",
    img: "icons/skills/melee/unarmed-punch-fist.webp",
    flags: moduleFlags(setId, "multiattack", "multiattack"),
    system: {
      description: {
        value: `<p>${sentence}</p>`,
        chat: "",
        unidentified: ""
      },
      type: { value: "monster" },
      activities: {
        [id]: {
          _id: id,
          type: "utility",
          name: "Use Multiattack",
          sort: 0,
          activation: activityActivation("action")
        }
      }
    }
  };
}
