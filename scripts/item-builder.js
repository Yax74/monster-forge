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

function buildAttackActivity(attack, plan, idFactory) {
  const id = idFactory();
  const extraParts = attack.dice.extraDice > 0 && attack.extraType !== "none"
    ? [damagePart(attack.dice.extraDice, Number(attack.extraDie), attack.extraType, idFactory)]
    : [];
  const useFlatBonus = plan.config.accuracyMode === "cr";

  return {
    id,
    data: {
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
    }
  };
}

function buildRiderActivity(attack, plan, idFactory) {
  if (!attack.rider || attack.rider === "none") return null;
  const id = idFactory();
  return {
    id,
    data: {
      _id: id,
      type: "save",
      name: `${RIDERS[attack.rider] ?? attack.rider} Save`,
      sort: 10,
      activation: activityActivation("special", `After ${attack.weapon.name} hits`),
      save: {
        ability: [attack.saveAbility],
        dc: saveDc(plan, attack.weapon.ability)
      },
      damage: { onSave: "none", parts: [] }
    }
  };
}

export function buildWeaponItem(attack, plan, { idFactory, setId, role }) {
  const attackActivity = buildAttackActivity(attack, plan, idFactory);
  const riderActivity = buildRiderActivity(attack, plan, idFactory);
  const activities = { [attackActivity.id]: attackActivity.data };
  if (riderActivity) activities[riderActivity.id] = riderActivity.data;

  const weaponName = escapeHtml(attack.weapon.name);
  const riderText = attack.rider !== "none"
    ? `<p><strong>Rider.</strong> On a hit, the target must succeed on a ${attack.saveAbility.toUpperCase()} saving throw or be ${escapeHtml(attack.rider)}. Use the item's Rider Save activity, then apply the condition manually or with your preferred automation module.</p>`
    : "";
  const accuracyText = plan.config.accuracyMode === "cr"
    ? `flat +${plan.suggestedAttackBonus}`
    : `actor proficiency + ${attack.weapon.ability.toUpperCase()}`;

  return {
    name: attack.weapon.name,
    type: "weapon",
    img: attack.weapon.img,
    flags: moduleFlags(setId, "attack", role),
    system: {
      description: {
        value: `<p><strong>Monster Forge estimate.</strong> ${weaponName} averages ${attack.averagePerHit} damage per hit (${attack.formula}); ${attack.count} use(s) contribute about ${attack.averagePerRound} DPR. Accuracy: ${accuracyText}.</p>${riderText}`,
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

  const saveText = hasSave
    ? ` The target makes a ${tertiary.saveAbility.toUpperCase()} saving throw; use the activity for the configured DC.`
    : "";

  return {
    name,
    type: "feat",
    img: "icons/magic/death/projectile-skull-flaming-green.webp",
    flags: moduleFlags(setId, "tertiary", "tertiary"),
    system: {
      description: {
        value: `<p>After it hits with an attack, the creature can deal an extra ${tertiary.dice}d${tertiary.die} ${escapeHtml(tertiary.damageType)} damage.${saveText}</p><p>Monster Forge budgets this feature at ${tertiary.usesPerRound} use(s) each round (${plan.tertiaryAverage} DPR). Adjust that assumption if the feature is situational or limited.</p>`,
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
        value: `<p>${sentence}</p><p><strong>Expected output:</strong> ${plan.achieved} DPR against a target of ${plan.target} (CR ${plan.stats.cr}; published Forge of Foes baseline ${plan.stats.dpr}). This is an offensive estimate, not a complete CR calculation.</p>`,
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
