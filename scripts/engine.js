import {
  ABILITIES,
  CR_KEYS,
  DAMAGE_TYPES,
  DEFAULTS,
  DIE_SIZES,
  FOF_STATS,
  RIDERS,
  WEAPONS
} from "./constants.js";

const FRACTION_BY_NUMBER = new Map([
  [0, "0"],
  [0.125, "1/8"],
  [0.25, "1/4"],
  [0.5, "1/2"]
]);

export function clamp(value, min, max, fallback = min) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : fallback;
}

export function roundHalf(value) {
  return Math.round(Number(value) * 2) / 2;
}

export function dieAverage(die) {
  return (Number(die) + 1) / 2;
}

export function normalizeCr(rawCr) {
  if (typeof rawCr === "string") {
    const trimmed = rawCr.trim();
    if (FOF_STATS[trimmed]) return trimmed;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) rawCr = parsed;
  }

  if (typeof rawCr === "number" && Number.isFinite(rawCr)) {
    if (FRACTION_BY_NUMBER.has(rawCr)) return FRACTION_BY_NUMBER.get(rawCr);
    const integer = String(Math.round(clamp(rawCr, 0, 30)));
    if (FOF_STATS[integer]) return integer;
  }

  return "0";
}

export function getCrStats(rawCr) {
  const cr = normalizeCr(rawCr);
  return { cr, ...FOF_STATS[cr] };
}

export function targetDpr(rawCr, roleModifier = 0) {
  const stats = getCrStats(rawCr);
  const modifier = clamp(roleModifier, -50, 50, 0);
  return roundHalf(stats.dpr * (1 + modifier / 100));
}

export function suggestedSaveDc(rawCr) {
  return getCrStats(rawCr).saveDc;
}

export function suggestedAttackBonus(rawCr) {
  return getCrStats(rawCr).attackBonus;
}

export function crToNumber(cr) {
  if (cr === "1/8") return 0.125;
  if (cr === "1/4") return 0.25;
  if (cr === "1/2") return 0.5;
  return Number(cr) || 0;
}

export function mergeDefaults(saved = {}, actorCr = DEFAULTS.cr) {
  return {
    ...DEFAULTS,
    ...saved,
    cr: normalizeCr(actorCr ?? saved.cr ?? DEFAULTS.cr),
    primary: { ...DEFAULTS.primary, ...(saved.primary ?? {}) },
    secondary: { ...DEFAULTS.secondary, ...(saved.secondary ?? {}) },
    tertiary: { ...DEFAULTS.tertiary, ...(saved.tertiary ?? {}) }
  };
}

/**
 * Apply Monster Forge's table-friendly attack cadence without deciding how
 * many distinct attack profiles the creature must have. With two profiles,
 * the selected damage split also controls the distribution of attacks.
 */
export function applyRecommendedAttacks(config = {}, rawCr = config.cr) {
  const recommendation = getCrStats(rawCr).recommendedAttacks;
  const merged = mergeDefaults(config, rawCr);
  const useSecondary = Boolean(merged.secondaryEnabled) && recommendation > 1;
  let primaryCount = recommendation;
  let secondaryCount = merged.secondary?.count ?? 1;

  if (useSecondary) {
    const split = clamp(merged.splitPrimary, 5, 95, DEFAULTS.splitPrimary) / 100;
    primaryCount = Math.min(recommendation - 1, Math.max(1, Math.round(recommendation * split)));
    secondaryCount = recommendation - primaryCount;
  }

  return {
    ...merged,
    cr: normalizeCr(rawCr),
    secondaryEnabled: useSecondary,
    primary: { ...merged.primary, count: primaryCount },
    secondary: { ...merged.secondary, count: secondaryCount }
  };
}

/**
 * Find a compact base/extra dice combination whose average is closest to the
 * requested dice-only average. At least one base die is retained so the item
 * remains a valid weapon attack.
 */
export function optimizeDice({
  targetAverage,
  baseDie,
  preferredBaseDice = 1,
  extraDie = 6,
  useExtra = false,
  maxDice = 100
}) {
  const target = Math.max(0, Number(targetAverage) || 0);
  const baseAverage = dieAverage(baseDie);
  const extraAverage = dieAverage(extraDie);
  let best;

  for (let baseDice = 1; baseDice <= maxDice; baseDice += 1) {
    const extraLimit = useExtra ? maxDice : 0;
    const extraMinimum = useExtra ? 1 : 0;
    for (let extraDice = extraMinimum; extraDice <= extraLimit; extraDice += 1) {
      const average = baseDice * baseAverage + extraDice * extraAverage;
      const error = Math.abs(average - target);
      const score = error * 10000
        + (baseDice + extraDice) * 10
        + Math.abs(baseDice - preferredBaseDice);

      if (!best || score < best.score) {
        best = { baseDice, extraDice, average, error, score };
      }

      if (average > target + Math.max(baseAverage, extraAverage) && extraDice > 0) break;
    }

    if (baseDice * baseAverage > target + baseAverage && best?.error === 0) break;
  }

  return {
    baseDice: best.baseDice,
    extraDice: best.extraDice,
    average: roundHalf(best.average),
    error: roundHalf(best.error)
  };
}

export function resolveWeapon(attack = {}) {
  if (attack.weaponKey !== "custom" && WEAPONS[attack.weaponKey]) {
    const preset = WEAPONS[attack.weaponKey];
    return {
      ...preset,
      name: attack.name?.trim() || preset.name,
      ability: attack.abilityOverride !== "auto" ? attack.abilityOverride : preset.ability
    };
  }

  const action = attack.customAction ?? "mwak";
  const customAbility = attack.abilityOverride !== "auto"
    ? attack.abilityOverride
    : attack.customAbility ?? "str";
  return {
    name: attack.name?.trim() || "Custom Attack",
    baseDice: 1,
    die: Number(attack.customDie) || 8,
    damageType: attack.customDamageType ?? "slashing",
    ability: customAbility,
    rangeType: action.startsWith("r") ? "ranged" : "melee",
    classification: action.endsWith("sak") ? "spell" : "weapon",
    weaponType: action.startsWith("r") ? "martialR" : "martialM",
    properties: [],
    range: action.startsWith("r")
      ? { value: 60, long: null, units: "ft" }
      : { value: 5, long: null, units: "ft" },
    img: "icons/svg/sword.svg"
  };
}

function normalizeAttack(attack, fallback) {
  const merged = { ...fallback, ...attack };
  const weaponKey = merged.weaponKey === "custom" || WEAPONS[merged.weaponKey]
    ? merged.weaponKey
    : fallback.weaponKey;
  return {
    ...merged,
    count: Math.round(clamp(merged.count, 1, 20, fallback.count)),
    weaponKey,
    name: String(merged.name ?? "").slice(0, 80),
    abilityOverride: ["auto", ...ABILITIES].includes(merged.abilityOverride) ? merged.abilityOverride : "auto",
    extraType: ["none", ...DAMAGE_TYPES].includes(merged.extraType) ? merged.extraType : "none",
    extraDie: DIE_SIZES.includes(Number(merged.extraDie)) ? Number(merged.extraDie) : fallback.extraDie,
    rider: Object.hasOwn(RIDERS, merged.rider) ? merged.rider : "none",
    saveAbility: ABILITIES.includes(merged.saveAbility) ? merged.saveAbility : fallback.saveAbility,
    customAction: ["mwak", "rwak", "msak", "rsak"].includes(merged.customAction) ? merged.customAction : "mwak",
    customAbility: ABILITIES.includes(merged.customAbility) ? merged.customAbility : "str",
    customDie: DIE_SIZES.includes(Number(merged.customDie)) ? Number(merged.customDie) : 8,
    customDamageType: DAMAGE_TYPES.includes(merged.customDamageType) ? merged.customDamageType : "slashing"
  };
}

export function normalizeConfig(config = {}) {
  const merged = mergeDefaults(config, config.cr ?? DEFAULTS.cr);
  const { budgetPoint: _legacyBudgetPoint, ...current } = merged;
  return {
    ...current,
    cr: normalizeCr(current.cr),
    roleModifier: clamp(current.roleModifier, -50, 50, 0),
    followCrAttacks: current.followCrAttacks !== false,
    accuracyMode: current.accuracyMode === "cr" ? "cr" : "actor",
    saveDcMode: current.saveDcMode === "actor" ? "actor" : "cr",
    riderAutomation: current.riderAutomation === "manual" ? "manual" : "midi",
    applyMode: current.applyMode === "append" ? "append" : "replace",
    splitPrimary: clamp(current.splitPrimary, 5, 95, DEFAULTS.splitPrimary),
    secondaryEnabled: Boolean(current.secondaryEnabled),
    primary: normalizeAttack(current.primary, DEFAULTS.primary),
    secondary: normalizeAttack(current.secondary, DEFAULTS.secondary),
    tertiary: {
      ...DEFAULTS.tertiary,
      ...current.tertiary,
      enabled: Boolean(current.tertiary?.enabled),
      preset: ["Sneak Attack", "Divine Smite", "Poison", "custom"].includes(current.tertiary?.preset)
        ? current.tertiary.preset
        : DEFAULTS.tertiary.preset,
      name: String(current.tertiary?.name ?? "").slice(0, 80),
      dice: Math.round(clamp(current.tertiary?.dice, 1, 100, DEFAULTS.tertiary.dice)),
      die: DIE_SIZES.includes(Number(current.tertiary?.die)) ? Number(current.tertiary.die) : DEFAULTS.tertiary.die,
      damageType: DAMAGE_TYPES.includes(current.tertiary?.damageType)
        ? current.tertiary.damageType
        : DEFAULTS.tertiary.damageType,
      usesPerRound: Math.round(clamp(current.tertiary?.usesPerRound, 1, 20, DEFAULTS.tertiary.usesPerRound)),
      saveAbility: ["none", ...ABILITIES].includes(current.tertiary?.saveAbility)
        ? current.tertiary.saveAbility
        : DEFAULTS.tertiary.saveAbility,
      dcAbility: ABILITIES.includes(current.tertiary?.dcAbility)
        ? current.tertiary.dcAbility
        : DEFAULTS.tertiary.dcAbility
    }
  };
}

function normalizeActorProfile(input = {}) {
  const abilityMods = input.abilityMods ?? input;
  return {
    abilityMods: Object.fromEntries(ABILITIES.map((ability) => [ability, Number(abilityMods?.[ability]) || 0])),
    proficiency: Number(input.proficiency ?? input.prof) || 0
  };
}

function actorSaveDc(profile, ability) {
  return 8 + profile.proficiency + (Number(profile.abilityMods[ability]) || 0);
}

function planAttack(attack, allocatedDpr, actorProfile) {
  const weapon = resolveWeapon(attack);
  const abilityMod = Number(actorProfile.abilityMods[weapon.ability]) || 0;
  const targetPerHit = allocatedDpr / attack.count;
  const diceTarget = Math.max(0, targetPerHit - abilityMod);
  const dice = optimizeDice({
    targetAverage: diceTarget,
    baseDie: weapon.die,
    preferredBaseDice: weapon.baseDice,
    extraDie: attack.extraDie,
    useExtra: attack.extraType && attack.extraType !== "none"
  });
  const averagePerHit = Math.max(0, dice.average + abilityMod);

  return {
    ...attack,
    weapon,
    abilityMod,
    attackBonus: abilityMod + actorProfile.proficiency,
    riderSaveDc: attack.rider !== "none" ? actorSaveDc(actorProfile, weapon.ability) : null,
    targetPerHit: roundHalf(targetPerHit),
    averagePerHit: roundHalf(averagePerHit),
    averagePerRound: roundHalf(averagePerHit * attack.count),
    dice,
    formula: formatDamageFormula({
      baseDice: dice.baseDice,
      baseDie: weapon.die,
      ability: weapon.ability,
      extraDice: dice.extraDice,
      extraDie: attack.extraDie,
      extraType: attack.extraType
    })
  };
}

export function buildDamagePlan(inputConfig = {}, actorData = {}) {
  const config = normalizeConfig(inputConfig);
  const actorProfile = normalizeActorProfile(actorData);
  const stats = getCrStats(config.cr);
  const target = targetDpr(config.cr, config.roleModifier);
  const tertiary = config.tertiary;
  const tertiaryAverage = tertiary.enabled
    ? roundHalf(tertiary.dice * dieAverage(tertiary.die) * tertiary.usesPerRound)
    : 0;
  const weaponBudget = Math.max(0, target - tertiaryAverage);
  const primaryShare = config.secondaryEnabled ? config.splitPrimary / 100 : 1;
  const primary = planAttack(config.primary, weaponBudget * primaryShare, actorProfile);
  const secondary = config.secondaryEnabled
    ? planAttack(config.secondary, weaponBudget * (1 - primaryShare), actorProfile)
    : null;
  const achieved = roundHalf(primary.averagePerRound + (secondary?.averagePerRound ?? 0) + tertiaryAverage);
  const variance = roundHalf(achieved - target);
  const warnings = [];
  const totalAttacks = primary.count + (secondary?.count ?? 0);

  if (tertiaryAverage > target) {
    warnings.push("The tertiary feature alone exceeds the selected DPR target.");
  }
  if (Math.abs(variance) > Math.max(2, target * 0.1)) {
    warnings.push(`Dice rounding produces ${variance > 0 ? "+" : ""}${variance} DPR versus the target.`);
  }
  if (totalAttacks !== stats.recommendedAttacks) {
    warnings.push(`This profile makes ${totalAttacks} attacks; Monster Forge recommends ${stats.recommendedAttacks} at CR ${stats.cr}.`);
  }
  if (config.roleModifier !== 0) {
    warnings.push("The damage adjustment intentionally moves the target away from the published Forge of Foes baseline.");
  }
  if (config.accuracyMode === "actor") {
    for (const [label, attack] of [["Primary", primary], ["Secondary", secondary]]) {
      if (attack && Math.abs(attack.attackBonus - stats.attackBonus) >= 2) {
        warnings.push(`${label} attack bonus ${attack.attackBonus >= 0 ? "+" : ""}${attack.attackBonus} differs from the Forge of Foes +${stats.attackBonus} benchmark.`);
      }
    }
  }

  return {
    config,
    stats,
    target,
    achieved,
    variance,
    weaponBudget: roundHalf(weaponBudget),
    tertiaryAverage,
    primary,
    secondary,
    totalAttacks,
    actorProfile,
    tertiarySaveDc: tertiary.enabled && tertiary.saveAbility !== "none"
      ? actorSaveDc(actorProfile, tertiary.dcAbility)
      : null,
    suggestedAttackBonus: suggestedAttackBonus(config.cr),
    suggestedSaveDc: suggestedSaveDc(config.cr),
    warnings
  };
}

export function formatDamageFormula({
  baseDice,
  baseDie,
  ability,
  extraDice = 0,
  extraDie = 6,
  extraType = "none"
}) {
  const parts = [`${baseDice}d${baseDie}`, `@abilities.${ability}.mod`];
  if (extraDice > 0 && extraType !== "none") parts.push(`${extraDice}d${extraDie} ${extraType}`);
  return parts.join(" + ");
}

export function crOptions(selectedCr) {
  const normalized = normalizeCr(selectedCr);
  return CR_KEYS.map((value) => ({ value, selected: value === normalized }));
}
