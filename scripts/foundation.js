import {
  ABILITIES,
  ACTOR_SIZES,
  COMBAT_ROLES,
  CREATURE_TIERS,
  DEFAULTS,
  SPECIES_PROFILES
} from "./constants.js";
import { clamp, getCrStats, resolveWeapon, roundHalf } from "./engine.js";

function optionalNumber(value, min, max, { integer = false } = {}) {
  if (value === "" || value === null || value === undefined) return "";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  const bounded = clamp(numeric, min, max, min);
  return integer ? Math.round(bounded) : bounded;
}

function selectedKey(value, collection, fallback) {
  return Object.hasOwn(collection, value) ? value : fallback;
}

function uniqueAbilities(values) {
  return [...new Set(values.filter((ability) => ABILITIES.includes(ability)))];
}

function signed(value) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function percent(value) {
  return `${value >= 0 ? "+" : ""}${value}%`;
}

export function crProficiency(rawCr) {
  const cr = getCrStats(rawCr).cr;
  const numeric = cr === "1/8" ? 0.125 : cr === "1/4" ? 0.25 : cr === "1/2" ? 0.5 : Number(cr);
  return 2 + Math.max(0, Math.floor((numeric - 1) / 4));
}

export function abilityModifier(score) {
  return Math.floor((Number(score) - 10) / 2);
}

export function scoreForModifier(modifier) {
  return Math.round(clamp(10 + 2 * Number(modifier), 1, 30, 10));
}

export function normalizeFoundationConfig(input = {}) {
  const source = input.foundation ?? input;
  const defaults = DEFAULTS.foundation;
  const manage = { ...defaults.manage, ...(source.manage ?? {}) };
  const rawOverrides = { ...defaults.overrides, ...(source.overrides ?? {}) };
  const rawAbilities = { ...defaults.overrides.abilities, ...(source.overrides?.abilities ?? {}) };

  return {
    mode: source.mode === "audit" ? "audit" : "apply",
    role: selectedKey(source.role, COMBAT_ROLES, defaults.role),
    species: selectedKey(source.species, SPECIES_PROFILES, defaults.species),
    tier: selectedKey(source.tier, CREATURE_TIERS, defaults.tier),
    castingAbility: ["auto", "int", "wis", "cha"].includes(source.castingAbility)
      ? source.castingAbility
      : defaults.castingAbility,
    hpPolicy: source.hpPolicy === "full" ? "full" : "ratio",
    manage: {
      hp: manage.hp !== false,
      ac: manage.ac !== false,
      abilities: manage.abilities !== false,
      body: manage.body !== false
    },
    overrides: {
      hp: optionalNumber(rawOverrides.hp, 1, 10000, { integer: true }),
      ac: optionalNumber(rawOverrides.ac, 1, 40, { integer: true }),
      attackBonus: optionalNumber(rawOverrides.attackBonus, -5, 30, { integer: true }),
      saveDc: optionalNumber(rawOverrides.saveDc, 5, 40, { integer: true }),
      dpr: optionalNumber(rawOverrides.dpr, 0, 2000),
      speed: optionalNumber(rawOverrides.speed, 0, 300, { integer: true }),
      darkvision: optionalNumber(rawOverrides.darkvision, 0, 1000, { integer: true }),
      size: Object.hasOwn(ACTOR_SIZES, rawOverrides.size) ? rawOverrides.size : "",
      abilities: Object.fromEntries(ABILITIES.map((ability) => [
        ability,
        optionalNumber(rawAbilities[ability], 1, 30, { integer: true })
      ]))
    }
  };
}

function resolvedCastingAbility(foundation, role) {
  if (!role.castingMode) return null;
  return foundation.castingAbility === "auto" ? role.attackAbility : foundation.castingAbility;
}

function roleAbilitySeeds(role, castingAbility) {
  const abilities = { ...role.abilities };
  if (!castingAbility || castingAbility === role.attackAbility) return abilities;
  const defaultScore = abilities[role.attackAbility];
  abilities[role.attackAbility] = abilities[castingAbility];
  abilities[castingAbility] = defaultScore;
  return abilities;
}

function configuredAbilities(config, role, foundation) {
  const attackAbilities = [];
  const saveAbilities = [];
  const attacks = [config.primary];
  if (config.secondaryEnabled) attacks.push(config.secondary);

  for (const attack of attacks.filter(Boolean)) {
    const ability = resolveWeapon(attack).ability;
    attackAbilities.push(ability);
    if (attack.rider && attack.rider !== "none") saveAbilities.push(ability);
  }

  if (config.tertiary?.enabled && config.tertiary.saveAbility !== "none") {
    saveAbilities.push(config.tertiary.dcAbility);
  }

  const castingAbility = resolvedCastingAbility(foundation, role);
  if (role.castingMode === "both" && castingAbility) attackAbilities.push(castingAbility);
  if (["both", "save"].includes(role.castingMode) && castingAbility) saveAbilities.push(castingAbility);

  return {
    castingAbility,
    attackAbilities: uniqueAbilities(attackAbilities.length ? attackAbilities : [castingAbility ?? role.attackAbility]),
    saveAbilities: uniqueAbilities(saveAbilities.length ? saveAbilities : [castingAbility ?? role.saveAbility])
  };
}

function roleSource(role) {
  const parts = [];
  if (role.hpPct) parts.push(`${percent(role.hpPct)} HP`);
  if (role.ac) parts.push(`${signed(role.ac)} AC`);
  if (role.attackBonus) parts.push(`${signed(role.attackBonus)} attack`);
  if (role.saveDc) parts.push(`${signed(role.saveDc)} DC`);
  if (role.dprPct) parts.push(`${percent(role.dprPct)} DPR`);
  if (role.speed) parts.push(`${signed(role.speed)} ft speed`);
  return parts.length ? parts.join(", ") : "no benchmark changes";
}

function tierSource(tier) {
  const parts = [];
  if (tier.hpMultiplier !== 1) parts.push(`${tier.hpMultiplier}× HP`);
  if (tier.dprMultiplier !== 1) parts.push(`${tier.dprMultiplier}× DPR`);
  return parts.length ? parts.join(", ") : "no multiplier";
}

function finalNumber(override, derived, round = Math.round) {
  return override === "" ? round(derived) : override;
}

export function buildFoundationPlan(inputConfig = {}, actorProfile = {}) {
  const foundation = normalizeFoundationConfig(inputConfig);
  const stats = getCrStats(inputConfig.cr ?? DEFAULTS.cr);
  const role = COMBAT_ROLES[foundation.role];
  const tier = CREATURE_TIERS[foundation.tier];
  const species = SPECIES_PROFILES[foundation.species];
  const proficiency = crProficiency(stats.cr);

  const derived = {
    hp: Math.max(1, stats.hp * (1 + role.hpPct / 100) * tier.hpMultiplier),
    ac: stats.ac + role.ac,
    attackBonus: stats.attackBonus + role.attackBonus,
    saveDc: stats.saveDc + role.saveDc,
    dpr: Math.max(0, stats.dpr * (1 + role.dprPct / 100) * tier.dprMultiplier)
  };
  const final = {
    hp: finalNumber(foundation.overrides.hp, derived.hp),
    ac: finalNumber(foundation.overrides.ac, derived.ac),
    attackBonus: finalNumber(foundation.overrides.attackBonus, derived.attackBonus),
    saveDc: finalNumber(foundation.overrides.saveDc, derived.saveDc),
    dpr: finalNumber(foundation.overrides.dpr, derived.dpr, roundHalf)
  };

  const castingAbility = resolvedCastingAbility(foundation, role);
  const roleAbilities = roleAbilitySeeds(role, castingAbility);
  const abilityScores = Object.fromEntries(ABILITIES.map((ability) => {
    const seed = Number(roleAbilities[ability]) || 10;
    const adjustment = Number(species.abilities?.[ability]) || 0;
    return [ability, Math.round(clamp(seed + adjustment, 1, 30, 10))];
  }));
  const { attackAbilities, saveAbilities } = configuredAbilities(inputConfig, role, foundation);
  const requiredModifiers = {};
  const attackModifier = final.attackBonus - proficiency;
  const saveModifier = final.saveDc - 8 - proficiency;

  for (const ability of attackAbilities) requiredModifiers[ability] = attackModifier;
  for (const ability of saveAbilities) {
    requiredModifiers[ability] = Math.max(requiredModifiers[ability] ?? -Infinity, saveModifier);
  }
  for (const [ability, modifier] of Object.entries(requiredModifiers)) {
    abilityScores[ability] = scoreForModifier(modifier);
  }
  const recommendedAbilities = { ...abilityScores };
  for (const ability of ABILITIES) {
    const override = foundation.overrides.abilities[ability];
    if (override !== "") abilityScores[ability] = override;
  }

  const abilityMods = Object.fromEntries(
    ABILITIES.map((ability) => [ability, abilityModifier(abilityScores[ability])])
  );
  const baseSpeed = species.speed ?? (Number.isFinite(Number(actorProfile.speed)) ? Number(actorProfile.speed) : null);
  const body = {
    size: foundation.overrides.size || species.size || actorProfile.size || null,
    speed: foundation.overrides.speed !== ""
      ? foundation.overrides.speed
      : baseSpeed === null ? null : Math.max(0, Math.round(baseSpeed + role.speed)),
    darkvision: foundation.overrides.darkvision !== ""
      ? foundation.overrides.darkvision
      : species.darkvision ?? (Number.isFinite(Number(actorProfile.darkvision)) ? Number(actorProfile.darkvision) : null)
  };

  const achievedAttackBonuses = Object.fromEntries(
    attackAbilities.map((ability) => [ability, proficiency + abilityMods[ability]])
  );
  const achievedSaveDcs = Object.fromEntries(
    saveAbilities.map((ability) => [ability, 8 + proficiency + abilityMods[ability]])
  );
  const warnings = [];
  if (foundation.tier === "minion" || foundation.tier === "boss") {
    warnings.push(`${tier.label} scaling changes durability and DPR only; reactions, legendary actions, and encounter action economy remain GM decisions.`);
  }
  if (Object.values(achievedAttackBonuses).some((value) => value !== final.attackBonus)) {
    warnings.push("One or more recommended ability scores cannot reproduce the foundation attack bonus exactly; a manual ability override or shared attack/DC ability is responsible.");
  }
  if (Object.values(achievedSaveDcs).some((value) => value !== final.saveDc)) {
    warnings.push("One or more recommended ability scores cannot reproduce the foundation save DC exactly; a manual ability override or shared attack/DC ability is responsible.");
  }
  if (foundation.species !== "preserve" && Object.keys(species.abilities ?? {}).length) {
    warnings.push("Species ability tendencies are Monster Forge recommendations based on the campaign's 2014-style species assumptions, not Forge of Foes rules.");
  }
  const selectedAttacks = [inputConfig.primary, inputConfig.secondaryEnabled ? inputConfig.secondary : null]
    .filter(Boolean)
    .map((attack) => resolveWeapon(attack));
  if (foundation.role === "caster" && selectedAttacks.length && selectedAttacks.every((attack) => attack.classification !== "spell")) {
    warnings.push("Caster is using only weapon attack profiles. Choose Arcane Bolt, Divine Bolt, Occult Bolt, or a custom spell attack if this is not intended to be a gish.");
  }

  return {
    config: foundation,
    stats,
    role,
    tier,
    species,
    proficiency,
    derived: {
      hp: Math.round(derived.hp),
      ac: Math.round(derived.ac),
      attackBonus: Math.round(derived.attackBonus),
      saveDc: Math.round(derived.saveDc),
      dpr: roundHalf(derived.dpr)
    },
    final,
    recommendedAbilities,
    abilities: abilityScores,
    abilityMods,
    attackAbilities,
    saveAbilities,
    achievedAttackBonuses,
    achievedSaveDcs,
    body,
    casting: {
      enabled: Boolean(role.castingMode),
      mode: role.castingMode ?? "none",
      ability: castingAbility,
      attackBonus: castingAbility && ["attack", "both"].includes(role.castingMode)
        ? proficiency + abilityMods[castingAbility]
        : null,
      saveDc: castingAbility && ["save", "both"].includes(role.castingMode)
        ? 8 + proficiency + abilityMods[castingAbility]
        : null
    },
    sources: {
      baseline: `Forge of Foes CR ${stats.cr}`,
      role: `Monster Forge ${role.label}: ${roleSource(role)}${castingAbility ? `; ${castingAbility.toUpperCase()} key ability` : ""}`,
      tier: `Monster Forge ${tier.label}: ${tierSource(tier)}`,
      species: foundation.species === "preserve"
        ? "Species/body: preserve the actor"
        : `${species.label}: ${ACTOR_SIZES[species.size]}, ${species.speed} ft, ${species.darkvision ? `${species.darkvision} ft darkvision` : "no darkvision"}`
    },
    warnings
  };
}

/**
 * Return the profile attacks will have after the selected foundation fields
 * are applied. Audit mode deliberately retains the live actor profile.
 */
export function getEffectiveActorProfile(plan, actorProfile = {}) {
  if (plan.config.mode !== "apply") return actorProfile;
  const abilities = plan.config.manage.abilities ? plan.abilityMods : actorProfile.abilityMods;
  return {
    ...actorProfile,
    abilityMods: { ...(actorProfile.abilityMods ?? {}), ...(abilities ?? {}) },
    abilityScores: plan.config.manage.abilities ? plan.abilities : actorProfile.abilityScores,
    proficiency: plan.proficiency,
    hp: plan.config.manage.hp ? plan.final.hp : actorProfile.hp,
    ac: plan.config.manage.ac ? plan.final.ac : actorProfile.ac,
    speed: plan.config.manage.body && plan.body.speed !== null ? plan.body.speed : actorProfile.speed,
    darkvision: plan.config.manage.body && plan.body.darkvision !== null ? plan.body.darkvision : actorProfile.darkvision,
    size: plan.config.manage.body && plan.body.size ? plan.body.size : actorProfile.size
  };
}
