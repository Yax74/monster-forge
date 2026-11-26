import {
  ABILITIES,
  ACTOR_SIZES,
  COMBAT_ROLES,
  CREATURE_TYPES,
  CR_KEYS,
  CREATURE_TIERS,
  DAMAGE_TYPES,
  DIE_SIZES,
  MODULE_ID,
  MODULE_TITLE,
  RIDERS,
  getSpeciesProfiles,
  setSpeciesProfileItems,
  WEAPONS
} from "./constants.js";
import {
  applyFoundationPlan,
  applyPlan,
  getActorCombatProfile,
  getExistingOffensiveItems,
  getGeneratedItems,
  removeGeneratedItems,
  estimateExistingDpr,
  undoLastOperation
} from "./actor-service.js";
import { applyRecommendedAttacks, buildDamagePlan, getCrStats, mergeDefaults } from "./engine.js";
import {
  buildFoundationPlan,
  getEffectiveActorProfile,
  normalizeFoundationConfig
} from "./foundation.js";
import {
  calculateBoostImpact,
  getBoostCatalog,
  normalizeBoostConfig,
  parseBoostForm,
  recommendBoosts,
  restoreBoostConfig,
  selectBoosts,
  setBoostCatalogItems
} from "./boosts.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function options(entries, selected) {
  return entries.map(([value, label]) => ({
    value: String(value),
    label,
    selected: String(value) === String(selected)
  }));
}

function actorCr(actor) {
  const cr = actor.system?.details?.cr;
  return cr?.value ?? cr ?? 0;
}

export function generatorSpecies(actor) {
  // Foundry validates getFlag() scopes and rejects module IDs that are not
  // currently active. Read this optional legacy integration from the stored
  // document data so Monster Forge can still open when NPC Generator is off.
  const species = actor.flags?.["wraeclast-npc-gen"]?.npc?.species
    ?? actor._source?.flags?.["wraeclast-npc-gen"]?.npc?.species;
  if (!species) return null;
  const normalized = String(species).toLowerCase() === "half-orc" || String(species).toLowerCase() === "halforc"
    ? "orc"
    : String(species).toLowerCase();
  const match = Object.entries(getSpeciesProfiles())
    .find(([_key, profile]) => profile.label.toLowerCase() === normalized);
  return match ? { key: match[0], label: match[1].label } : null;
}

function attackContext(attack) {
  return {
    ...attack,
    weaponOptions: options([
      ["custom", "— Custom attack —"],
      ...Object.entries(WEAPONS).map(([key, weapon]) => [key, `${weapon.name} (${weapon.baseDice}d${weapon.die} ${weapon.damageType})`])
    ], attack.weaponKey),
    abilityOptions: options([
      ["auto", "Preset/default ability"],
      ...ABILITIES.map((ability) => [ability, ability.toUpperCase()])
    ], attack.abilityOverride ?? "auto"),
    extraTypeOptions: options([
      ["none", "No extra damage type"],
      ...DAMAGE_TYPES.map((type) => [type, type[0].toUpperCase() + type.slice(1)])
    ], attack.extraType),
    extraDieOptions: options(DIE_SIZES.map((die) => [die, `d${die}`]), attack.extraDie),
    riderOptions: options(Object.entries(RIDERS), attack.rider),
    saveOptions: options(ABILITIES.map((ability) => [ability, ability.toUpperCase()]), attack.saveAbility),
    customActionOptions: options([
      ["mwak", "Melee weapon"],
      ["rwak", "Ranged weapon"],
      ["msak", "Melee spell"],
      ["rsak", "Ranged spell"]
    ], attack.customAction ?? "mwak"),
    customAbilityOptions: options(ABILITIES.map((ability) => [ability, ability.toUpperCase()]), attack.customAbility ?? "str"),
    customDieOptions: options(DIE_SIZES.map((die) => [die, `d${die}`]), attack.customDie ?? 8),
    customDamageOptions: options(DAMAGE_TYPES.map((type) => [type, type[0].toUpperCase() + type.slice(1)]), attack.customDamageType ?? "slashing"),
    customReach: attack.customReach ?? 5,
    customRange: attack.customRange ?? 60,
    customLongRange: attack.customLongRange ?? 120
  };
}

function availableItemPacks() {
  return [...(game.packs?.values?.() ?? [])]
    .filter((pack) => pack.documentName === "Item" && pack.collection !== "monster-forge.npc-content")
    .map((pack) => ({ id: pack.collection, label: pack.metadata?.label ?? pack.title ?? pack.collection }))
    .sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
}

let compendiumLibraryItems = [];

export async function refreshCompendiumLibrary() {
  const items = [];
  for (const id of configuredContentPacks()) {
    const pack = game.packs.get(id);
    if (!pack || pack.documentName !== "Item") continue;
    items.push(...await pack.getDocuments());
  }
  compendiumLibraryItems = items;
  setSpeciesProfileItems(items.filter((item) => item.getFlag(MODULE_ID, "library")?.kind === "species-profile"));
  setBoostCatalogItems(items.filter((item) => item.getFlag(MODULE_ID, "library")?.kind === "boost"));
}

async function buildContext(actor, config, isNewNpc = false) {
  const generated = getGeneratedItems(actor);
  const existingOffense = getExistingOffensiveItems(actor);
  const midiActive = Boolean(game.modules?.get?.("midi-qol")?.active);
  const daeActive = Boolean(game.modules?.get?.("dae")?.active);
  const importedSpecies = generatorSpecies(actor);
  const hasFoundation = Boolean(actor.getFlag(MODULE_ID, "foundation"));
  const boostConfig = normalizeBoostConfig(config.boosts);
  const recommendedBoosts = recommendBoosts({ role: config.foundation.role, tier: config.foundation.tier });
  const boostCatalog = getBoostCatalog();
  const contentGroups = [...getAvailableContent(boostConfig, recommendedBoosts).reduce((groups, entry) => {
    const key = entry.groupKey;
    const group = groups.get(key) ?? {
      id: key, label: entry.groupLabel, section: entry.section,
      sort: entry.categorySort, entries: []
    };
    group.entries.push(entry);
    groups.set(key, group);
    return groups;
  }, new Map()).values()]
    .sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label))
    .map((group) => ({
      ...group,
      count: group.entries.length,
      selectedCount: group.entries.filter((entry) => entry.selected).length
    }));
  const profiles = Array.isArray(game.settings.get(MODULE_ID, "profiles"))
    ? game.settings.get(MODULE_ID, "profiles")
    : [];
  return {
    isNewNpc,
    isGM: Boolean(game.user?.isGM),
    contentGroups,
    contentGroupCount: contentGroups.length,
    contentPacks: availableItemPacks().map((pack) => ({ ...pack, linked: configuredContentPacks().includes(pack.id) })),
    defaultSpeciesTraits: Boolean(game.settings.get(MODULE_ID, "defaultSpeciesTraits")),
    creatureTypeOptions: options(CREATURE_TYPES.map((type) => [type, type[0].toUpperCase() + type.slice(1)]), "humanoid"),
    newSpeciesOptions: options(Object.entries(getSpeciesProfiles())
      .filter(([key]) => key !== "preserve" && !CREATURE_TYPES.includes(key))
      .map(([key, species]) => [key, species.label]), "human"),
    identity: {
      name: actor.name,
      creatureType: actor.flags?.[MODULE_ID]?.identity?.creatureType ?? actor.system?.details?.type?.value ?? "humanoid",
      species: actor.flags?.[MODULE_ID]?.identity?.species ?? actor.system?.details?.type?.subtype ?? "human",
      img: actor.img ?? "",
      addSpeciesTraits: Boolean(game.settings.get(MODULE_ID, "defaultSpeciesTraits")),
      hasIdentity: Boolean(actor.flags?.[MODULE_ID]?.identity)
    },
    actor: {
      name: actor.name,
      cr: getCrStats(config.cr).cr,
      generated: generated.length,
      existingOffense: existingOffense.length,
      existingOffenseNames: existingOffense.slice(0, 6).map((item) => item.name).join(", "),
      existingOffenseMore: Math.max(0, existingOffense.length - 6),
      estimatedExistingDpr: estimateExistingDpr(actor),
      hasUndo: Boolean(actor.getFlag(MODULE_ID, "lastOperation")),
      hasFoundation,
      hasLegacyData: Boolean(actor.getFlag("world", "monsterForgeData")),
      importedSpecies: hasFoundation ? null : importedSpecies?.label ?? null
    },
    integration: {
      midiActive,
      daeActive,
      ready: midiActive && daeActive
    },
    config,
    profileOptions: [{ value: "", label: "Select saved profile", selected: true }, ...profiles.map((profile) => ({
      value: profile.id, label: profile.name, selected: false
    }))],
    quickMode: Boolean(game.settings.get(MODULE_ID, "quickMode")),
    crOptions: options(CR_KEYS.map((cr) => [cr, `CR ${cr}`]), config.cr),
    foundation: {
      ...config.foundation,
      modeOptions: options([
        ["apply", "Apply selected foundation fields"],
        ["audit", "Preview only; leave actor stats unchanged"]
      ], config.foundation.mode),
      roleOptions: options(
        Object.entries(COMBAT_ROLES).map(([key, role]) => [key, role.label]),
        config.foundation.role
      ),
      tierOptions: options(
        Object.entries(CREATURE_TIERS).map(([key, tier]) => [key, tier.label]),
        config.foundation.tier
      ),
      speciesOptions: options(
        Object.entries(getSpeciesProfiles()).map(([key, species]) => [key, species.label]),
        config.foundation.species
      ),
      hpPolicyOptions: options([
        ["ratio", "Preserve current HP percentage"],
        ["full", "Set current HP to full"]
      ], config.foundation.hpPolicy),
      sizeOptions: options([
        ["", "Use species / preserve actor"],
        ...Object.entries(ACTOR_SIZES)
      ], config.foundation.overrides.size),
      castingAbilityOptions: options([
        ["auto", "Auto (role default)"],
        ["int", "Intelligence"],
        ["wis", "Wisdom"],
        ["cha", "Charisma"]
      ], config.foundation.castingAbility),
      abilityFields: ABILITIES.map((ability) => ({
        key: ability,
        label: ability.toUpperCase(),
        value: config.foundation.overrides.abilities[ability]
      }))
    },
    boosts: {
      ...boostConfig,
      found: boostCatalog.entries.length,
      selectedCount: Object.keys(boostConfig.selections).length,
      recommendations: recommendedBoosts,
      warnings: boostConfig.legacyCount
        ? [`${boostConfig.legacyCount} saved compendium boost selection(s) could not be migrated. Choose a built-in replacement below.`]
        : []
    },
    damageAdjustmentOptions: options([
      [-20, "−20% DPR"],
      [-10, "−10% DPR"],
      [0, "No fine adjustment"],
      [10, "+10% DPR"],
      [20, "+20% DPR"]
    ], config.roleModifier),
    accuracyOptions: options([
      ["actor", "Use actor ability + proficiency"],
      ["cr", "Use flat foundation attack bonus"]
    ], config.accuracyMode),
    saveDcOptions: options([
      ["cr", "Use flat foundation save DC"],
      ["actor", "Use the attack/feature ability DC"]
    ], config.saveDcMode),
    riderAutomationOptions: options([
      ["midi", "Midi-QOL: trigger save and apply condition"],
      ["manual", "Manual save and condition"]
    ], config.riderAutomation),
    applyModeOptions: options([
      ["replace", "Replace only Monster Forge items"],
      ["append", "Add another generated set"]
    ], config.applyMode),
    splitOptions: options([
      [50, "50% primary / 50% secondary"],
      [60, "60% primary / 40% secondary"],
      [75, "75% primary / 25% secondary"]
    ], config.splitPrimary),
    secondaryModeOptions: options([
      ["combined", "Combined routine (and)"],
      ["alternative", "Alternative routine (or)"]
    ], config.secondaryMode),
    primary: attackContext(config.primary),
    secondary: attackContext(config.secondary),
    tertiary: {
      ...config.tertiary,
      presetOptions: options([
        ["Sneak Attack", "Sneak Attack"],
        ["Divine Smite", "Divine Smite"],
        ["Poison", "Poison"],
        ["custom", "— Custom feature —"]
      ], config.tertiary.preset),
      dieOptions: options(DIE_SIZES.map((die) => [die, `d${die}`]), config.tertiary.die),
      damageTypeOptions: options(DAMAGE_TYPES.map((type) => [type, type[0].toUpperCase() + type.slice(1)]), config.tertiary.damageType),
      saveOptions: options([
        ["none", "No saving throw"],
        ...ABILITIES.map((ability) => [ability, ability.toUpperCase()])
      ], config.tertiary.saveAbility),
      dcAbilityOptions: options(ABILITIES.map((ability) => [ability, ability.toUpperCase()]), config.tertiary.dcAbility)
    }
  };
}

function field(formData, name, fallback = "") {
  const value = formData.get(name);
  return value === null ? fallback : value;
}

function numberField(formData, name, fallback) {
  const value = Number(field(formData, name, fallback));
  return Number.isFinite(value) ? value : fallback;
}

function optionalNumberField(formData, name) {
  const value = String(field(formData, name, "")).trim();
  if (!value) return "";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : "";
}

function parseAttack(formData, prefix) {
  return {
    count: numberField(formData, `${prefix}.count`, 1),
    weaponKey: field(formData, `${prefix}.weaponKey`, "custom"),
    name: field(formData, `${prefix}.name`, "").trim(),
    abilityOverride: field(formData, `${prefix}.abilityOverride`, "auto"),
    extraType: field(formData, `${prefix}.extraType`, "none"),
    extraDie: numberField(formData, `${prefix}.extraDie`, 6),
    rider: field(formData, `${prefix}.rider`, "none"),
    saveAbility: field(formData, `${prefix}.saveAbility`, "str"),
    customAction: field(formData, `${prefix}.customAction`, "mwak"),
    customAbility: field(formData, `${prefix}.customAbility`, "str"),
    customDie: numberField(formData, `${prefix}.customDie`, 8),
    customDamageType: field(formData, `${prefix}.customDamageType`, "slashing"),
    customReach: numberField(formData, `${prefix}.customReach`, 5),
    customRange: numberField(formData, `${prefix}.customRange`, 60),
    customLongRange: numberField(formData, `${prefix}.customLongRange`, 120)
  };
}

export function parseForgeForm(form) {
  const data = new FormData(form);
  const creatureTypeField = form.elements.namedItem("newNpc.creatureType");
  const newCreatureType = creatureTypeField?.value ?? "humanoid";
  return {
    newNpc: {
      name: field(data, "newNpc.name", "New Creature").trim() || "New Creature",
      creatureType: field(data, "newNpc.creatureType", "humanoid"),
      species: field(data, "newNpc.species", "human"),
      img: field(data, "newNpc.img", ""),
      addSpeciesTraits: data.has("newNpc.addSpeciesTraits")
    },
    selectedContent: data.getAll("content.items"),
    cr: field(data, "cr", "0"),
    sections: {
      build: data.has("sections.build"),
      foundation: data.has("sections.foundation"),
      boosts: data.has("sections.boosts"),
      attacks: data.has("sections.attacks"),
      content: data.has("sections.content")
    },
    foundation: {
      mode: field(data, "foundation.mode", "apply"),
      role: field(data, "foundation.role", "balanced"),
      tier: field(data, "foundation.tier", "standard"),
      species: creatureTypeField
        ? newCreatureType !== "humanoid" ? newCreatureType : field(data, "newNpc.species", "human")
        : field(data, "foundation.species", "preserve"),
      castingAbility: field(data, "foundation.castingAbility", "auto"),
      hpPolicy: field(data, "foundation.hpPolicy", "ratio"),
      manage: {
        hp: data.has("foundation.manage.hp"),
        ac: data.has("foundation.manage.ac"),
        abilities: data.has("foundation.manage.abilities"),
        body: data.has("foundation.manage.body")
      },
      overrides: {
        hp: optionalNumberField(data, "foundation.overrides.hp"),
        ac: optionalNumberField(data, "foundation.overrides.ac"),
        attackBonus: optionalNumberField(data, "foundation.overrides.attackBonus"),
        saveDc: optionalNumberField(data, "foundation.overrides.saveDc"),
        dpr: optionalNumberField(data, "foundation.overrides.dpr"),
        speed: optionalNumberField(data, "foundation.overrides.speed"),
        darkvision: optionalNumberField(data, "foundation.overrides.darkvision"),
        size: field(data, "foundation.overrides.size", ""),
        abilities: Object.fromEntries(ABILITIES.map((ability) => [
          ability,
          optionalNumberField(data, `foundation.overrides.abilities.${ability}`)
        ]))
      }
    },
    boosts: parseBoostForm(data),
    roleModifier: numberField(data, "roleModifier", 0),
    reserveExistingDpr: data.has("reserveExistingDpr"),
    existingDpr: optionalNumberField(data, "existingDpr"),
    followCrAttacks: data.has("followCrAttacks"),
    accuracyMode: field(data, "accuracyMode", "actor"),
    saveDcMode: field(data, "saveDcMode", "cr"),
    riderAutomation: field(data, "riderAutomation", "midi"),
    applyMode: field(data, "applyMode", "replace"),
    secondaryEnabled: data.has("secondaryEnabled"),
    secondaryMode: field(data, "secondaryMode", "combined"),
    splitPrimary: numberField(data, "splitPrimary", 60),
    primary: parseAttack(data, "primary"),
    secondary: parseAttack(data, "secondary"),
    tertiary: {
      enabled: data.has("tertiary.enabled"),
      preset: field(data, "tertiary.preset", "Poison"),
      name: field(data, "tertiary.name", "").trim(),
      dice: numberField(data, "tertiary.dice", 2),
      die: numberField(data, "tertiary.die", 6),
      damageType: field(data, "tertiary.damageType", "poison"),
      usesPerRound: numberField(data, "tertiary.usesPerRound", 1),
      saveAbility: field(data, "tertiary.saveAbility", "none"),
      dcAbility: field(data, "tertiary.dcAbility", "con")
    }
  };
}

function setText(root, selector, value) {
  const element = root.querySelector(selector);
  if (element) element.textContent = String(value);
}

function toggle(root, selector, visible) {
  const element = root.querySelector(selector);
  if (element) element.hidden = !visible;
}

function setSectionStates(root, config, foundation, plan) {
  const summaries = {
    build: config.sections.build
      ? foundation.config.mode === "apply" ? `On · write CR ${foundation.stats.cr}` : "Preview only · no CR write"
      : "Off · selected CR remains a planning input",
    foundation: config.sections.foundation
      ? foundation.config.mode === "apply" ? "On · write enabled actor fields" : "Preview only · no actor fields"
      : "Off · use the actor's current statistics",
    boosts: config.sections.boosts
      ? `On · ${plan.boosts.selected.length} selected`
      : `Off · ${plan.boosts.selected.length} selection(s) retained`,
    attacks: config.sections.attacks
      ? `On · ${plan.alternative ? "alternative (or)" : plan.secondary ? "combined (and)" : "single"} routine`
      : "Off · no attack items will change",
    content: config.sections.content ? "On · selected NPC items will be copied" : "Off · selected NPC items will be ignored"
  };

  for (const section of ["build", "foundation", "boosts", "attacks", "content"]) {
    const enabled = Boolean(config.sections[section]);
    const panel = root.querySelector(`[data-section-panel='${section}']`);
    const body = root.querySelector(`[data-section-body='${section}']`);
    const badge = root.querySelector(`[data-tab-status='${section}']`);
    panel?.classList.toggle("is-section-disabled", !enabled);
    if (body) {
      const remainsInteractive = body.hasAttribute("data-planning-body");
      body.inert = !enabled && !remainsInteractive;
      body.setAttribute("aria-disabled", String(!enabled && !remainsInteractive));
      body.classList.toggle("is-planning-only", !enabled && remainsInteractive);
    }
    if (badge) {
      badge.textContent = foundation.config.mode === "audit" && ["build", "foundation"].includes(section) && enabled
        ? "Preview"
        : enabled ? "On" : "Off";
      badge.classList.toggle("is-off", !enabled);
    }
    setText(root, `[data-preview='section-${section}']`, summaries[section]);
  }
}

function activateTab(root, name) {
  for (const button of root.querySelectorAll("[data-tab-target]")) {
    const active = button.dataset.tabTarget === name;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  }
  for (const panel of root.querySelectorAll("[data-tab-panel]")) {
    const active = panel.dataset.tabPanel === name;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
  }
}

function signed(value) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function benchmarkStatus(value, target, tolerance, label) {
  const actual = Number(value);
  const expected = Number(target);
  if (!Number.isFinite(actual) || !Number.isFinite(expected) || expected <= 0) return `${label}: unavailable`;
  const delta = actual - expected;
  if (Math.abs(delta) <= tolerance) return `${label}: on benchmark`;
  return `${label}: ${delta > 0 ? "above" : "below"} by ${Math.abs(Math.round(delta * 10) / 10)}`;
}

function buildForgePlan(config, actor) {
  const { newNpc: _newNpc, selectedContent: _selectedContent, ...forgeConfig } = config;
  config = forgeConfig;
  const enteredExistingDpr = config.existingDpr;
  const existingEstimate = estimateExistingDpr(actor);
  config = {
    ...config,
    existingDpr: config.reserveExistingDpr
      ? config.existingDpr === "" ? existingEstimate : config.existingDpr
      : 0
  };
  const actorProfile = getActorCombatProfile(actor);
  const foundation = buildFoundationPlan(config, actorProfile);
  const effectiveProfile = getEffectiveActorProfile(foundation, actorProfile, config.sections);
  const plan = buildDamagePlan({
    ...config,
    foundation: foundation.config
  }, effectiveProfile, foundation.final);
  // Keep the blank/automatic state in client defaults and profiles; the per-actor estimate is exposed separately on the plan.
  plan.config.existingDpr = enteredExistingDpr;
  plan.foundation = foundation;
  plan.boosts = selectBoosts(plan.config.boosts, { actor });
  plan.boosts.impact = calculateBoostImpact(plan.boosts.selected, { actorProfile, foundation, plan });
  return { actorProfile, effectiveProfile, foundation, plan };
}

function abilitySummary(scores) {
  return ABILITIES.map((ability) => `${ability.toUpperCase()} ${scores[ability]}`).join(" · ");
}

function bodySummary(body) {
  const size = ACTOR_SIZES[body.size] ?? "Preserved";
  const speed = body.speed === null ? "speed preserved" : `${body.speed} ft speed`;
  const vision = body.darkvision === null
    ? "vision preserved"
    : body.darkvision > 0 ? `${body.darkvision} ft darkvision` : "no darkvision";
  return `${size} · ${speed} · ${vision}`;
}

function castingSummary(casting) {
  if (!casting.enabled) return "Not a spell-led role";
  const parts = [casting.ability.toUpperCase()];
  if (casting.attackBonus !== null) parts.push(`spell attack ${signed(casting.attackBonus)}`);
  if (casting.saveDc !== null) parts.push(`save DC ${casting.saveDc}`);
  return parts.join(" · ");
}

function updateBoostDetails(root, entries) {
  const list = root.querySelector("[data-preview='boost-details']");
  if (!list) return;
  list.replaceChildren();
  list.hidden = entries.length === 0;
  for (const entry of entries) {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = entry.displayName;
    item.append(name);
    if (entry.summary) {
      const summary = document.createElement("span");
      summary.textContent = entry.description;
      item.append(summary);
    }
    const badges = document.createElement("small");
    badges.className = "mf-boost-badges";
    badges.textContent = `${entry.categoryLabel} · ${entry.powerLabel} power · ${entry.actionLabel} · ${entry.automationLabel} · ${entry.impactLabel}`;
    item.append(badges);
    list.append(item);
  }
}

function updateBoostImpact(root, impact) {
  const list = root.querySelector("[data-preview='boost-impact']");
  if (!list) return;
  list.replaceChildren();
  list.hidden = !impact.rows.length;
  for (const row of impact.rows) {
    const item = document.createElement("div");
    const label = document.createElement("strong");
    const value = document.createElement("span");
    label.textContent = row.key;
    value.textContent = `${row.before} → ${row.after}`;
    item.append(label, value);
    list.append(item);
  }
}

function updatePreview(root, actor) {
  const form = root.querySelector("form") ?? root.closest("form") ?? root;
  const config = parseForgeForm(form);
  const { actorProfile: profile, foundation, plan } = buildForgePlan(config, actor);
  const existingOffense = getExistingOffensiveItems(actor);
  const midiReady = Boolean(game.modules?.get?.("midi-qol")?.active && game.modules?.get?.("dae")?.active);

  setSectionStates(root, config, foundation, plan);
  for (const element of root.querySelectorAll("[data-attacks-only]")) {
    element.hidden = !config.sections.attacks;
  }
  toggle(root, "[data-panel='secondary']", config.secondaryEnabled);
  toggle(root, "[data-field='split']", config.secondaryEnabled && config.secondaryMode === "combined");
  toggle(root, "[data-panel='tertiary']", config.tertiary.enabled);
  toggle(root, "[data-custom='primary']", config.primary.weaponKey === "custom");
  toggle(root, "[data-custom='secondary']", config.secondary.weaponKey === "custom");
  toggle(root, "[data-range-melee='primary']", config.primary.customAction?.startsWith("m"));
  toggle(root, "[data-range-ranged='primary']", config.primary.customAction?.startsWith("r"));
  toggle(root, "[data-range-melee='secondary']", config.secondary.customAction?.startsWith("m"));
  toggle(root, "[data-range-ranged='secondary']", config.secondary.customAction?.startsWith("r"));
  toggle(root, "[data-rider-save='primary']", config.primary.rider !== "none");
  toggle(root, "[data-rider-save='secondary']", config.secondary.rider !== "none");
  toggle(root, "[data-tertiary-dc]", config.tertiary.saveAbility !== "none" && config.saveDcMode === "actor");
  toggle(root, "[data-existing-dpr-field]", config.reserveExistingDpr);
  toggle(root, "[data-foundation-apply]", foundation.config.mode === "apply");
  toggle(root, "[data-casting-ability]", foundation.casting.enabled);

  setText(root, "[data-preview='baseline']", plan.stats.dpr);
  setText(root, "[data-preview='target']", plan.benchmarkTarget);
  setText(root, "[data-preview='achieved']", plan.achieved);
  setText(root, "[data-preview='existing-dpr']", plan.existingDpr ? `${plan.existingDpr} reserved` : "Not reserved");
  setText(root, "[data-preview='generated-dpr']", plan.generatedAchieved);
  setText(root, "[data-preview='existing-note']", config.reserveExistingDpr
    ? `Estimated at ${plan.existingDpr} DPR and subtracted from the budget. It assumes each offensive item is used once per round; verify multiattack, recharge, and limited-use features.`
    : "Their damage is not included in the generated DPR budget.");
  const existingDprInput = form.elements.namedItem("existingDpr");
  if (existingDprInput) existingDprInput.placeholder = `Auto: ${estimateExistingDpr(actor)}`;
  setText(root, "[data-preview='variance']", `${plan.variance > 0 ? "+" : ""}${plan.variance}`);
  setText(root, "[data-preview='attacks']", `${plan.totalAttacks} (${plan.stats.recommendedAttacks} suggested; ${plan.stats.publishedAttacks} published)`);
  const accuracy = config.accuracyMode === "cr"
    ? `Flat +${plan.suggestedAttackBonus}`
    : [`Primary ${signed(plan.primary.attackBonus)}`, plan.secondary ? `Secondary ${signed(plan.secondary.attackBonus)}` : null]
      .filter(Boolean).join(" · ");
  const actorDcs = [
    plan.primary.riderSaveDc !== null ? `Primary DC ${plan.primary.riderSaveDc}` : null,
    plan.secondary?.riderSaveDc !== null && plan.secondary?.riderSaveDc !== undefined ? `Secondary DC ${plan.secondary.riderSaveDc}` : null,
    plan.tertiarySaveDc !== null ? `Feature DC ${plan.tertiarySaveDc}` : null
  ].filter(Boolean);
  const saveDc = config.saveDcMode === "cr"
    ? `DC ${plan.suggestedSaveDc}`
    : actorDcs.join(" · ") || "No generated save";
  setText(root, "[data-preview='accuracy']", accuracy);
  setText(root, "[data-preview='save-dc']", saveDc);
  setText(root, "[data-preview='primary']", `${plan.primary.weapon.name}: ${plan.primary.formula} ≈ ${plan.primary.averagePerHit}/hit × ${plan.primary.count}`);
  setText(root, "[data-preview='secondary']", plan.secondary
    ? `${plan.secondary.weapon.name}: ${plan.secondary.formula} ≈ ${plan.secondary.averagePerHit}/hit × ${plan.secondary.count}`
    : "Disabled");
  setText(root, "[data-preview='routine']", plan.alternative
    ? "Alternative profiles (or): only one profile's round DPR is counted"
    : plan.secondary ? "Combined profiles (and): both profiles count toward round DPR" : "Single attack profile");
  setText(root, "[data-preview='tertiary']", config.tertiary.enabled
    ? `${config.tertiary.dice}d${config.tertiary.die} ${config.tertiary.damageType} × ${config.tertiary.usesPerRound} = ${plan.tertiaryAverage} DPR`
    : "Disabled");
  setText(root, "[data-preview='actor-hp']", profile.hp || "—");
  setText(root, "[data-preview='fof-hp']", foundation.final.hp);
  setText(root, "[data-preview='actor-ac']", profile.ac || "—");
  setText(root, "[data-preview='fof-ac']", foundation.final.ac);
  setText(root, "[data-preview='actor-attack']", accuracy);
  setText(root, "[data-preview='fof-attack']", signed(foundation.final.attackBonus));
  setText(root, "[data-preview='actor-dc']", saveDc);
  setText(root, "[data-preview='fof-dc']", `DC ${foundation.final.saveDc}`);
  const actorSectionsEnabled = config.sections.build || config.sections.foundation;
  setText(root, "[data-preview='foundation-mode']", foundation.config.mode === "apply" && actorSectionsEnabled ? "Selected fields enabled" : "Preview only");
  setText(root, "[data-preview='foundation-role']", `${foundation.role.label} · ${foundation.role.description}`);
  setText(root, "[data-preview='foundation-tier']", `${foundation.tier.label} · ${foundation.tier.description}`);
  setText(root, "[data-preview='foundation-species']", foundation.sources.species);
  setText(root, "[data-preview='foundation-source']", `${foundation.sources.baseline} · ${foundation.sources.role} · ${foundation.sources.tier}`);
  setText(root, "[data-preview='foundation-abilities']", abilitySummary(foundation.abilities));
  setText(root, "[data-preview='foundation-casting']", castingSummary(foundation.casting));
  setText(root, "[data-preview='foundation-body']", bodySummary(foundation.body));
  setText(root, "[data-preview='foundation-cr']", `${profile.cr ?? "—"} → ${foundation.stats.cr}`);
  setText(root, "[data-preview='foundation-hp']", `${profile.hp || "—"} → ${foundation.final.hp}`);
  setText(root, "[data-preview='foundation-ac']", `${profile.ac || "—"} → ${foundation.final.ac}`);
  setText(root, "[data-preview='foundation-offense']", `${signed(foundation.final.attackBonus)} / DC ${foundation.final.saveDc} / ${plan.benchmarkTarget} DPR`);
  const hpStatus = benchmarkStatus(profile.hp, foundation.final.hp, Math.max(5, foundation.final.hp * 0.2), "HP");
  const acStatus = benchmarkStatus(profile.ac, foundation.final.ac, 1, "AC");
  const attackStatus = benchmarkStatus(plan.primary.attackBonus, foundation.final.attackBonus, 1, "Attack");
  const generatedDc = plan.primary.riderSaveDc ?? plan.tertiarySaveDc ?? plan.suggestedSaveDc;
  const dcStatus = benchmarkStatus(generatedDc, foundation.final.saveDc, 1, "Save DC");
  setText(root, "[data-preview='hp-delta']", hpStatus);
  setText(root, "[data-preview='ac-delta']", acStatus);
  setText(root, "[data-preview='attack-delta']", attackStatus);
  setText(root, "[data-preview='dc-delta']", dcStatus);
  setText(root, "[data-preview='audit-summary']", `Benchmark check (not a full CR calculation): Defense — ${hpStatus}; ${acStatus}. Offense — ${attackStatus}; ${dcStatus}; total DPR ${plan.achieved} vs ${plan.benchmarkTarget}.`);
  for (const ability of ABILITIES) {
    const suggested = foundation.recommendedAbilities[ability];
    const final = foundation.abilities[ability];
    setText(root, `[data-preview='ability-${ability}-suggested']`, suggested);
    setText(root, `[data-preview='ability-${ability}-final']`, final);
    const input = form.elements.namedItem(`foundation.overrides.abilities.${ability}`);
    if (input) input.placeholder = `Auto: ${suggested}`;
    root.querySelector(`[data-ability='${ability}']`)?.classList
      .toggle("is-overridden", foundation.config.overrides.abilities[ability] !== "");
  }
  const selectedBoostNames = plan.boosts.selected.map((entry) => entry.displayName);
  setText(root, "[data-preview='boosts']", config.sections.boosts
    ? selectedBoostNames.length ? selectedBoostNames.join(" · ") : "None selected"
    : "Disabled (selections retained)");
  updateBoostDetails(root, plan.boosts.selected);
  updateBoostImpact(root, plan.boosts.impact);

  const varianceCard = root.querySelector("[data-metric='achieved']");
  varianceCard?.classList.toggle("is-warning", Math.abs(plan.variance) > Math.max(2, plan.benchmarkTarget * 0.1));

  const warnings = root.querySelector("[data-preview='warnings']");
  if (warnings) {
    warnings.replaceChildren();
    const previewWarnings = [
      ...(config.sections.build || config.sections.foundation ? foundation.warnings : []),
      ...(config.sections.attacks ? plan.warnings : []),
      ...(config.sections.boosts ? plan.boosts.warnings : [])
    ];
    if (foundation.config.mode === "audit" && (config.sections.build || config.sections.foundation)) {
      previewWarnings.push("Foundation mode is Preview only: actor CR, defenses, abilities, and body data will not be changed, and actor-derived attacks will continue to use the current actor profile.");
    }
    if (config.sections.foundation && foundation.config.mode === "apply" && !foundation.config.manage.abilities && config.accuracyMode === "actor") {
      previewWarnings.push("Ability management is off, so actor-derived attack bonuses may not reach the selected foundation benchmark.");
    }
    if (!config.sections.foundation && config.sections.attacks && config.accuracyMode === "actor") {
      previewWarnings.push("Foundation & Attributes is off, so generated attacks use the actor's current ability scores.");
    }
    if (config.sections.attacks && existingOffense.length) {
      previewWarnings.push(config.reserveExistingDpr
        ? `Existing-item DPR is reserved at ${plan.existingDpr}. The estimate assumes each offensive item is used once per round; review the estimate for multiattack, recharge, or limited-use features.`
        : `${existingOffense.length} existing offensive item(s) are not included in this generated DPR budget.`);
    }
    const hasRider = config.primary.rider !== "none" || (config.secondaryEnabled && config.secondary.rider !== "none");
    if (config.sections.attacks && config.riderAutomation === "midi" && hasRider && !midiReady) {
      previewWarnings.push("Midi-QOL rider automation is selected, but both Midi-QOL and DAE must be active for automatic save chaining and condition application.");
    }
    if (config.sections.boosts && foundation.config.role === "caster" && !plan.boosts.selected.some((entry) => entry.kind === "caster")) {
      previewWarnings.push("Caster role has no caster-progression boost selected. This is valid, but spellcasting level and spells must then be managed separately.");
    }
    if (config.sections.boosts && plan.boosts.selected.length) {
      previewWarnings.push("Selected boosts are layered after the FoF foundation. Review shows their stat and action-economy impact separately from the FoF benchmark.");
    }
    if (!Object.values(config.sections).some(Boolean)) {
      previewWarnings.push("Every section is off. Enable at least one section before applying.");
    }
    if (!previewWarnings.length) {
      const item = document.createElement("li");
      item.className = "is-good";
      item.textContent = "Damage allocation is close to the selected target.";
      warnings.append(item);
    } else {
      for (const warning of previewWarnings) {
        const item = document.createElement("li");
        item.textContent = warning;
        warnings.append(item);
      }
    }
  }

  return plan;
}

function refreshManagementState(root, actor) {
  const count = getGeneratedItems(actor).length;
  setText(root, "[data-generated-count]", count);
  const undo = root.querySelector("[data-action='undo']");
  const remove = root.querySelector("[data-action='remove']");
  if (undo) undo.disabled = !actor.getFlag(MODULE_ID, "lastOperation");
  if (remove) remove.disabled = count === 0;
}

async function confirmAction({ title, content }) {
  return foundry.applications.api.DialogV2.confirm({
    window: { title },
    content,
    modal: true,
    rejectClose: false
  });
}

function updateContentControls(root, form) {
  const search = String(root.querySelector("[data-content-search]")?.value ?? "").trim().toLowerCase();
  const selectedOnly = Boolean(root.querySelector("[data-content-selected-only]")?.checked);
  const groups = [...root.querySelectorAll("[data-content-group]")];
  for (const group of groups) {
    let visible = 0;
    let selected = 0;
    for (const card of group.querySelectorAll("[data-content-entry]")) {
      const checkbox = card.querySelector("input[type='checkbox']");
      if (checkbox?.checked) selected += 1;
      const nameField = card.querySelector("[data-boost-name-field]");
      const nameInput = card.querySelector("[data-boost-name-input]");
      if (nameField) nameField.hidden = !checkbox?.checked;
      if (nameInput) nameInput.disabled = !checkbox?.checked;
      const matches = !search || card.dataset.search.toLowerCase().includes(search);
      card.hidden = !matches || (selectedOnly && !checkbox?.checked);
      if (!card.hidden) visible += 1;
    }
    group.hidden = visible === 0;
    const count = group.querySelector("[data-content-group-count]");
    if (count) count.textContent = selected ? `${selected}/${group.dataset.total} selected` : String(group.dataset.total);
    if (search && visible) group.open = true;
  }
  setText(root, "[data-boost-selected-count]", `${form.querySelectorAll("[data-boost-item]:checked").length} selected`);
}

function clearBoostSelects(root) {
  for (const input of root.querySelectorAll("[data-boost-item]")) input.checked = false;
  for (const input of root.querySelectorAll("[data-boost-name-input]")) input.value = "";
}

function flattenConfig(value, prefix = "", output = {}) {
  for (const [key, child] of Object.entries(value ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(child)) {
      output[path] = child;
    } else if (child && typeof child === "object") {
      flattenConfig(child, path, output);
    } else {
      output[path] = child;
    }
  }
  return output;
}

function applyProfileToForm(form, config) {
  const flat = flattenConfig(config);
  for (const element of form.elements) {
    if (!element.name) continue;
    let path = element.name;
    if (path.startsWith("boosts.selection.")) path = path.replace("boosts.selection.", "boosts.selections.");
    if (path.startsWith("boosts.name.")) path = path.replace("boosts.name.", "boosts.names.");
    const value = path === "content.items" ? flat.selectedContent : flat[path];
    if (element.type === "checkbox") {
      if (element.name.startsWith("boosts.selection.")) element.checked = String(value ?? "") === element.value;
      else element.checked = Array.isArray(value) ? value.includes(element.value) : Boolean(value);
    } else if (value !== undefined && !Array.isArray(value)) {
      element.value = value ?? "";
    }
  }
}

function updateAutoTraitSummary(root, form) {
  const summary = root.querySelector("[data-auto-trait-summary]");
  if (!summary) return;
  const toggle = form.elements.namedItem("newNpc.addSpeciesTraits");
  if (!toggle?.checked) {
    summary.hidden = true;
    return;
  }
  const species = form.elements.namedItem("newNpc.species")?.value;
  const parent = { drow: "elf", duergar: "dwarf", deepGnome: "gnome" }[species];
  const names = [...root.querySelectorAll("[data-content-entry]")]
    .filter((entry) => entry.dataset.kind === "species-trait"
      && entry.dataset.species.split(", ").some((key) => key === species || key === parent))
    .map((entry) => entry.querySelector("strong")?.textContent)
    .filter(Boolean);
  summary.textContent = names.length
    ? `Species traits to add automatically: ${names.join(", ")}.`
    : "No automatic species traits are mapped for this profile yet; you can select custom traits below.";
  summary.hidden = false;
}

function attachListeners(_event, dialog, actor) {
  const root = dialog.element;
  const form = dialog.form ?? root.querySelector("form");
  if (!form) return;
  const preview = () => {
    updateContentControls(root, form);
    updateAutoTraitSummary(root, form);
    updatePreview(root, actor);
  };

  const profileSelect = root.querySelector("[data-profile-select]");
  profileSelect?.addEventListener("change", () => {
    const profile = (game.settings.get(MODULE_ID, "profiles") ?? []).find((entry) => entry.id === profileSelect.value);
    if (!profile) return;
    applyProfileToForm(form, profile.config);
    const nameInput = root.querySelector("[data-profile-name]");
    if (nameInput) nameInput.value = profile.name;
    preview();
  });

  root.querySelector("[data-action='save-profile']")?.addEventListener("click", async () => {
    const nameInput = root.querySelector("[data-profile-name]");
    const name = String(nameInput?.value ?? "").trim().slice(0, 60);
    if (!name) {
      ui.notifications.warn("Enter a name for this build profile first.");
      nameInput?.focus();
      return;
    }
    const profiles = [...(game.settings.get(MODULE_ID, "profiles") ?? [])];
    const existing = profiles.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
    const profile = { id: existing?.id ?? foundry.utils.randomID(), name, config: parseForgeForm(form) };
    const next = existing
      ? profiles.map((entry) => entry.id === existing.id ? profile : entry)
      : [...profiles, profile];
    await game.settings.set(MODULE_ID, "profiles", next);
    ui.notifications.info(`Monster Forge profile “${name}” saved.`);
    if (profileSelect && !profileSelect.querySelector(`option[value="${CSS.escape(profile.id)}"]`)) {
      profileSelect.add(new Option(name, profile.id));
    }
    if (profileSelect) profileSelect.value = profile.id;
  });

  root.querySelector("[data-action='delete-profile']")?.addEventListener("click", async () => {
    const id = profileSelect?.value;
    if (!id) return;
    const profiles = [...(game.settings.get(MODULE_ID, "profiles") ?? [])];
    const profile = profiles.find((entry) => entry.id === id);
    if (!profile) return;
    const confirmed = await confirmAction({
      title: "Delete build profile",
      content: `<p>Delete the saved profile <strong>${escapeHtml(profile.name)}</strong>?</p>`
    });
    if (!confirmed) return;
    await game.settings.set(MODULE_ID, "profiles", profiles.filter((entry) => entry.id !== id));
    profileSelect.querySelector(`option[value="${CSS.escape(id)}"]`)?.remove();
    profileSelect.value = "";
  });

  const quickToggle = root.querySelector("[data-quick-mode]");
  const setQuickMode = (enabled) => {
    root.querySelector(".monster-forge")?.classList.toggle("is-quick-mode", enabled);
    const controls = root.querySelector("[data-quick-section-controls]");
    if (controls) controls.hidden = !enabled;
    if (quickToggle) quickToggle.checked = enabled;
    if (enabled && ["foundation", "boosts"].includes(root.querySelector("[data-tab-target].is-active")?.dataset.tabTarget)) {
      activateTab(root, "build");
    }
  };
  setQuickMode(Boolean(game.settings.get(MODULE_ID, "quickMode")));
  quickToggle?.addEventListener("change", async () => {
    setQuickMode(quickToggle.checked);
    await game.settings.set(MODULE_ID, "quickMode", quickToggle.checked);
  });
  root.querySelector("[data-content-search]")?.addEventListener("input", preview);
  root.querySelector("[data-content-selected-only]")?.addEventListener("change", preview);
  root.querySelector("[data-action='save-gm-setup']")?.addEventListener("click", async () => {
    if (!game.user?.isGM) return;
    const ids = selectedContentPackIds(form);
    const invalid = ids.find((id) => game.packs.get(id)?.documentName !== "Item");
    if (invalid) {
      ui.notifications.error(`Monster Forge can only link Item compendiums. “${invalid}” is unavailable or is not an Item pack.`);
      return;
    }
    await game.settings.set(MODULE_ID, "contentPacks", ids.join(","));
    await game.settings.set(MODULE_ID, "defaultSpeciesTraits", Boolean(form.elements.namedItem("gm.defaultSpeciesTraits")?.checked));
    ui.notifications.info("Monster Forge GM setup saved. Close and reopen the Forge to load the updated compendium library.");
  });
  const syncRecommendation = () => {
    const recommended = applyRecommendedAttacks(parseForgeForm(form));
    const primaryCount = form.elements.namedItem("primary.count");
    const secondaryCount = form.elements.namedItem("secondary.count");
    if (primaryCount) primaryCount.value = recommended.primary.count;
    if (secondaryCount) secondaryCount.value = recommended.secondary.count;
  };

  form.addEventListener("input", (event) => {
    if (["primary.count", "secondary.count"].includes(event.target?.name)) {
      const follow = form.elements.namedItem("followCrAttacks");
      if (follow) follow.checked = false;
    }
    preview();
  });
  form.addEventListener("change", (event) => {
    if (event.target?.matches?.("[data-boost-item]") && event.target.checked) {
      const groupName = event.target.name;
      for (const sibling of form.querySelectorAll(`input[name="${CSS.escape(groupName)}"][data-boost-item]`)) {
        if (sibling !== event.target) sibling.checked = false;
      }
    }
    if (event.target?.name === "newNpc.creatureType") {
      const type = event.target.value;
      const speciesPicker = root.querySelector("[data-new-species-picker]");
      const speciesField = form.elements.namedItem("newNpc.species");
      const foundationSpecies = form.elements.namedItem("foundation.species");
      const locked = type !== "humanoid";
      if (speciesPicker) {
        if (locked) {
          if (!speciesPicker.disabled && speciesPicker.value) speciesPicker.dataset.lastHumanoid = speciesPicker.value;
          let typeOption = [...speciesPicker.options].find((option) => option.value === type);
          if (!typeOption) {
            typeOption = new Option(getSpeciesProfiles()[type]?.label ?? type[0].toUpperCase() + type.slice(1), type);
            typeOption.dataset.creatureType = "true";
            speciesPicker.add(typeOption);
          }
          speciesPicker.value = type;
          speciesPicker.disabled = true;
        } else {
          speciesPicker.querySelector("option[data-creature-type='true']")?.remove();
          speciesPicker.disabled = false;
          const previousSpecies = speciesPicker.dataset.lastHumanoid;
          speciesPicker.value = [...speciesPicker.options].some((option) => option.value === previousSpecies) ? previousSpecies : "human";
        }
      }
      if (speciesField) speciesField.value = locked ? type : (speciesPicker?.value ?? "human");
      if (foundationSpecies && speciesField) {
        foundationSpecies.value = speciesField.value;
        foundationSpecies.disabled = locked;
      }
      updateAutoTraitSummary(root, form);
    }
    if (event.target?.matches?.("[data-new-species-picker]")) {
      const speciesField = form.elements.namedItem("newNpc.species");
      const foundationSpecies = form.elements.namedItem("foundation.species");
      event.target.dataset.lastHumanoid = event.target.value;
      if (speciesField) speciesField.value = event.target.value;
      if (foundationSpecies) {
        foundationSpecies.value = event.target.value;
        foundationSpecies.disabled = false;
      }
    }
    if (event.target?.name === "foundation.species" && form.elements.namedItem("newNpc.creatureType")?.value !== "humanoid") {
      event.target.value = form.elements.namedItem("newNpc.creatureType").value;
    }
    const quickSection = event.target?.dataset?.quickSection;
    if (quickSection) {
      const sectionInput = form.elements.namedItem(`sections.${quickSection}`);
      if (sectionInput) sectionInput.checked = event.target.checked;
    } else if (event.target?.name?.startsWith("sections.")) {
      const section = event.target.name.slice("sections.".length);
      const quickInput = root.querySelector(`[data-quick-section='${CSS.escape(section)}']`);
      if (quickInput) quickInput.checked = event.target.checked;
    }
    const follow = form.elements.namedItem("followCrAttacks");
    const shouldSync = follow?.checked && ["cr", "secondaryEnabled", "secondaryMode", "splitPrimary", "followCrAttacks"].includes(event.target?.name);
    if (shouldSync) syncRecommendation();
    preview();
  });

  root.querySelector("[data-action='recommend-boosts']")?.addEventListener("click", () => {
    clearBoostSelects(root);
    const recommended = recommendBoosts({
      role: form.elements.namedItem("foundation.role")?.value,
      tier: form.elements.namedItem("foundation.tier")?.value
    });
    for (const input of root.querySelectorAll("[data-boost-item]")) input.checked = recommended.has(input.value);
    preview();
  });

  root.querySelector("[data-action='clear-boosts']")?.addEventListener("click", () => {
    clearBoostSelects(root);
    preview();
  });

  for (const button of root.querySelectorAll("[data-tab-target]")) {
    button.addEventListener("click", () => activateTab(root, button.dataset.tabTarget));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const buttons = [...root.querySelectorAll("[data-tab-target]")];
      const current = buttons.indexOf(button);
      const next = event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
      event.preventDefault();
      activateTab(root, buttons[next].dataset.tabTarget);
      buttons[next].focus();
    });
  }

  root.querySelector("[data-action='recommend-attacks']")?.addEventListener("click", () => {
    syncRecommendation();
    preview();
  });

  root.querySelector("[data-action='undo']")?.addEventListener("click", async () => {
    const confirmed = await confirmAction({
      title: "Undo Monster Forge",
      content: `<p>Undo the last Monster Forge operation on <strong>${escapeHtml(actor.name)}</strong>?</p>`
    });
    if (!confirmed) return;
    try {
      const result = await undoLastOperation(actor);
      if (result.undone) {
        const actorText = result.actorRestored ? " Actor foundation stats were restored." : "";
        ui.notifications.info(`Monster Forge: removed ${result.removed} and restored ${result.restored} item(s).${actorText}`);
      }
      else ui.notifications.warn(result.reason);
      refreshManagementState(root, actor);
      preview();
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to undo the last operation.`, error);
      ui.notifications.error(`Monster Forge: ${error.message}`);
    }
  });

  root.querySelector("[data-action='remove']")?.addEventListener("click", async () => {
    const count = getGeneratedItems(actor).length;
    const confirmed = await confirmAction({
      title: "Remove Generated Items",
      content: `<p>Remove ${count} Monster Forge item(s) from <strong>${escapeHtml(actor.name)}</strong>? Other actor items will not be touched, and this can be undone once.</p>`
    });
    if (!confirmed) return;
    try {
      const result = await removeGeneratedItems(actor);
      ui.notifications.info(`Monster Forge: removed ${result.removed} generated item(s).`);
      refreshManagementState(root, actor);
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to remove generated items.`, error);
      ui.notifications.error(`Monster Forge: ${error.message}`);
    }
  });

  const initialTab = root.querySelector("[data-tab-target].is-active")?.dataset.tabTarget ?? "build";
  activateTab(root, initialTab);
  preview();
}

export async function openForge(targetActor = null) {
  try {
    if (game.system.id !== "dnd5e") throw new Error("Monster Forge requires the D&D5e game system.");
    let actor = targetActor;
    if (!actor) {
      const controlled = canvas?.tokens?.controlled?.map((token) => token.actor).filter(Boolean) ?? [];
      if (controlled.length > 1) throw new Error("Select one NPC token, or clear the selection to create a new creature.");
      if (!controlled.length) return createNpcFromScratch();
      actor = controlled[0];
    }
    await refreshCompendiumLibrary();
    if (actor.type !== "npc") throw new Error(`${actor.name} is not an NPC actor.`);
    if (!actor.isOwner) throw new Error(`You do not have permission to edit ${actor.name}.`);

    const saved = await getSavedDefaults();
    const actorFoundation = actor.getFlag(MODULE_ID, "foundation")?.config;
    const importedSpecies = generatorSpecies(actor);
    const identitySpecies = actor.flags?.[MODULE_ID]?.identity?.species
      ?? actor.system?.details?.type?.subtype;
    const actorSpeciesKey = identitySpecies && getSpeciesProfiles()[String(identitySpecies).replaceAll(" ", "").toLowerCase()]
      ? String(identitySpecies).replaceAll(" ", "").toLowerCase()
      : importedSpecies?.key;
    const rememberedFoundation = actorFoundation
      ? { ...(saved.foundation ?? {}), ...actorFoundation }
      : actorSpeciesKey
        ? { ...(saved.foundation ?? {}), species: actorSpeciesKey }
        : saved.foundation;
    const remembered = rememberedFoundation
      ? { ...saved, foundation: rememberedFoundation }
      : saved;
    let config = mergeDefaults(remembered, actorCr(actor));
    config.foundation = normalizeFoundationConfig(config);
    config.boosts = restoreBoostConfig(actor, config.boosts);
    if (config.followCrAttacks) config = applyRecommendedAttacks(config, config.cr);
    const context = await buildContext(actor, config);
    const render = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
    const content = await render(`modules/${MODULE_ID}/templates/forge-dialog.hbs`, context);

    return foundry.applications.api.DialogV2.wait({
      id: `${MODULE_ID}-dialog`,
      window: { title: `${MODULE_TITLE}: ${actor.name}`, icon: "fa-solid fa-hammer" },
      position: { width: 920, height: "auto" },
      content,
      rejectClose: false,
      render: (event, dialog) => attachListeners(event, dialog, actor),
      buttons: [
        {
          action: "foundation",
          label: "Apply build & foundation",
          icon: "fa-solid fa-shield-halved",
          callback: async (_event, button) => {
            try {
              const parsed = parseForgeForm(button.form);
              const { foundation, plan } = buildForgePlan(parsed, actor);
              await game.settings.set(MODULE_ID, "defaults", plan.config);
              const result = await applyFoundationPlan(actor, foundation, plan.config.sections);
              ui.notifications.info(`Monster Forge applied ${result.updatedFields} enabled build/foundation field(s) to ${actor.name}.`);
              return true;
            } catch (error) {
              console.error(`${MODULE_ID} | Failed to apply the NPC foundation.`, error);
              ui.notifications.error(`Monster Forge: ${error.message}`);
              return false;
            }
          }
        },
        {
          action: "apply",
          label: "Forge NPC",
          icon: "fa-solid fa-hammer",
          default: true,
          callback: async (_event, button) => {
            try {
              const parsed = parseForgeForm(button.form);
              const { plan } = buildForgePlan(parsed, actor);
              plan.contentItems = await resolveSelectedContent(parsed.selectedContent);
              await game.settings.set(MODULE_ID, "defaults", plan.config);
              const result = await applyPlan(actor, plan);
              const actions = [];
              if (result.created.length) {
                const boostText = result.boosts
                  ? `, including ${result.boosts} boost${result.boosts === 1 ? "" : "s"}`
                  : "";
                actions.push(`added ${result.created.length} generated item(s)${boostText}`);
              }
              if (result.actorUpdated) actions.push("updated the enabled actor fields");
              if (result.replaced) actions.push(`replaced ${result.replaced} prior generated item(s)`);
              ui.notifications.info(`Monster Forge ${actions.join(" and ")} on ${actor.name}.`);
              return true;
            } catch (error) {
              console.error(`${MODULE_ID} | Failed to forge attacks.`, error);
              ui.notifications.error(`Monster Forge: ${error.message}`);
              return false;
            }
          }
        },
        { action: "close", label: "Cancel", icon: "fa-solid fa-xmark" }
      ]
    });
  } catch (error) {
    console.error(`${MODULE_ID} | ${error.message}`, error);
    ui.notifications.warn(error.message);
    return null;
  }
}

function emptyNpcDraft(name = "New Creature") {
  return {
    name,
    type: "npc",
    isOwner: true,
    items: [],
    system: {
      details: { cr: 0 },
      attributes: { hp: { value: 1, max: 1 }, ac: { value: 10 }, movement: { walk: 30 }, senses: { darkvision: 0 }, prof: 2 },
      abilities: Object.fromEntries(ABILITIES.map((ability) => [ability, { value: 10, mod: 0 }])),
      traits: { size: "med" }
    },
    flags: {},
    getFlag: () => null
  };
}

async function getSavedDefaults() {
  const saved = { ...(game.settings.get(MODULE_ID, "defaults") ?? {}) };
  if (!game.settings.get(MODULE_ID, "foundationDefaultsV19")) {
    // Earlier versions defaulted to actor-derived attack/DC math, which could
    // force high suggested ability scores at upper CRs. Preserve every other
    // saved preference while adopting the less prescriptive 1.9 defaults.
    saved.accuracyMode = "cr";
    saved.saveDcMode = "cr";
    await game.settings.set(MODULE_ID, "defaults", saved);
    await game.settings.set(MODULE_ID, "foundationDefaultsV19", true);
  }
  return saved;
}

/** Open the builder without requiring a selected or pre-existing NPC. */
export async function createNpcFromScratch() {
  try {
    if (game.system.id !== "dnd5e") throw new Error("Monster Forge requires the D&D5e game system.");
    await refreshCompendiumLibrary();
    const saved = await getSavedDefaults();
    let config = mergeDefaults(saved, "0");
    config.foundation = normalizeFoundationConfig(config);
    config.foundation.species = "human";
    config.sections.content = true;
    config = applyRecommendedAttacks(config, config.cr);
    const draft = emptyNpcDraft();
    const context = await buildContext(draft, config, true);
    context.identity.name = "New Creature";
    context.identity.creatureType = "humanoid";
    context.identity.species = "human";
    context.identity.img = "";
    context.identity.addSpeciesTraits = Boolean(game.settings.get(MODULE_ID, "defaultSpeciesTraits"));
    const render = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
    const content = await render(`modules/${MODULE_ID}/templates/forge-dialog.hbs`, context);

    return foundry.applications.api.DialogV2.wait({
      id: `${MODULE_ID}-create-dialog`,
      window: { title: `${MODULE_TITLE}: New NPC`, icon: "fa-solid fa-hammer" },
      position: { width: 920, height: "auto" },
      content,
      rejectClose: false,
      render: (_event, dialog) => attachListeners(_event, dialog, draft),
      buttons: [
        {
          action: "create",
          label: "Create & Forge NPC",
          icon: "fa-solid fa-hammer",
          default: true,
          callback: async (_event, button) => {
            let created = null;
            try {
              const parsed = parseForgeForm(button.form);
              const creatureType = parsed.newNpc.creatureType;
              parsed.newNpc.species = creatureType === "humanoid" ? parsed.newNpc.species : creatureType;
              parsed.foundation.species = parsed.newNpc.species;
              const image = parsed.newNpc.img.trim();
              const speciesProfile = getSpeciesProfiles()[parsed.newNpc.species];
              const actorData = {
                name: parsed.newNpc.name,
                type: "npc",
                img: image || "icons/svg/mystery-man.svg",
                system: {
                  details: { cr: 0, type: { value: creatureType, subtype: parsed.newNpc.species } },
                  traits: { size: speciesProfile?.size ?? "med" },
                  attributes: {
                    movement: { walk: speciesProfile?.speed ?? 30 },
                    senses: { darkvision: speciesProfile?.darkvision ?? 0 }
                  }
                }
              };
              created = await Actor.create(actorData);
              if (!created) throw new Error("Foundry did not create the NPC actor.");
              const { plan } = buildForgePlan(parsed, created);
              const manualItems = await resolveSelectedContent(parsed.selectedContent);
              const speciesItems = parsed.newNpc.addSpeciesTraits
                ? await loadSpeciesTraitItems(parsed.newNpc.species)
                : [];
              const seen = new Set(manualItems.map((item) => item.flags?.[MODULE_ID]?.sourceUuid));
              plan.contentItems = [...manualItems, ...speciesItems.filter((item) => !seen.has(item.flags?.[MODULE_ID]?.sourceUuid))];
              await applyPlan(created, plan);
              await created.setFlag(MODULE_ID, "identity", {
                creatureType,
                species: parsed.newNpc.species,
                addSpeciesTraits: parsed.newNpc.addSpeciesTraits
              });
              ui.notifications.info(`Monster Forge created ${created.name}.`);
              created.sheet?.render(true);
              return true;
            } catch (error) {
              if (created) await created.delete().catch(() => {});
              console.error(`${MODULE_ID} | Failed to create a new NPC.`, error);
              ui.notifications.error(`Monster Forge: ${error.message}`);
              return false;
            }
          }
        },
        { action: "close", label: "Cancel", icon: "fa-solid fa-xmark" }
      ]
    });
  } catch (error) {
    console.error(`${MODULE_ID} | ${error.message}`, error);
    ui.notifications.warn(error.message);
    return null;
  }
}

function configuredContentPacks() {
  const packIds = ["monster-forge.npc-content"];
  const configured = String(game.settings.get(MODULE_ID, "contentPacks") ?? "")
    .split(",").map((id) => id.trim()).filter(Boolean);
  packIds.push(...configured);
  return [...new Set(packIds)];
}

function selectedContentPackIds(form) {
  return [...form.querySelectorAll("input[name='gm.contentPack']:checked")]
    .map((input) => input.value)
    .filter((id) => id && id !== "monster-forge.npc-content");
}

function plainDescription(item) {
  const html = String(item.system?.description?.value ?? "");
  const holder = document.createElement("div");
  holder.innerHTML = html;
  return holder.textContent?.trim().replace(/\s+/g, " ") ?? "";
}

function getAvailableContent(boostConfig = {}, recommendedBoosts = []) {
  const entries = [];
  for (const item of compendiumLibraryItems) {
    const library = item.getFlag(MODULE_ID, "library");
    if (!library || library.template || !["action", "trait", "species-trait", "boost"].includes(library.kind)) continue;
    const isBoost = library.kind === "boost";
    const boost = library.boost ?? {};
    if (isBoost && (!boost.id || !library.group)) continue;
    const species = [].concat(library.species ?? []).join(", ") || "Any";
    const category = isBoost
      ? String(library.categoryLabel ?? library.category ?? "Boosts")
      : library.kind === "species-trait"
        ? `${species} species traits`
        : String(library.categoryLabel ?? library.category ?? (library.kind === "action" ? "Actions" : "Traits"));
    const groupKey = isBoost
      ? `boost-${library.category}`
      : library.kind === "species-trait"
        ? `species-${[].concat(library.species ?? []).join("-") || "general"}`
        : `${library.kind}-${library.category ?? library.kind}`;
    const groupLabel = isBoost
      ? category
      : library.kind === "species-trait"
        ? `${species} species traits`
        : category;
    const boostGroup = String(library.group ?? boost.groupId ?? "");
    const boostId = String(boost.id ?? "");
    entries.push({
      uuid: item.uuid,
      name: item.name,
      kindKey: library.kind,
      kind: isBoost ? "Boost" : library.kind === "species-trait" ? "Species trait" : library.kind === "action" ? "Action" : "Trait",
      species,
      category,
      groupKey,
      groupLabel,
      categorySort: Number(library.categorySort) || 100,
      section: isBoost ? "boosts" : "content",
      isBoost,
      boostId,
      boostGroup,
      selectionName: isBoost ? `boosts.selection.${boostGroup}` : "content.items",
      selectionValue: isBoost ? boostId : item.uuid,
      selected: isBoost ? boostConfig.selections?.[boostGroup] === boostId : false,
      customName: isBoost ? boostConfig.names?.[boostGroup] ?? "" : "",
      recommended: isBoost && recommendedBoosts.includes(boostId),
      description: plainDescription(item) || boost.description || boost.summary || "",
      img: item.img || library.categoryIcon || "icons/magic/symbols/runes-star-blue.webp"
    });
  }
  return entries.sort((a, b) => a.categorySort - b.categorySort || a.groupLabel.localeCompare(b.groupLabel) || a.name.localeCompare(b.name));
}

async function resolveSelectedContent(uuids = []) {
  const result = [];
  for (const uuid of uuids) {
    const item = await fromUuid(uuid);
    if (!item || item.documentName !== "Item") continue;
    const data = item.toObject();
    delete data._id;
    data.flags ??= {};
    data.flags[MODULE_ID] = { ...(data.flags[MODULE_ID] ?? {}), generated: true, kind: "content", sourceUuid: item.uuid };
    result.push(data);
  }
  return result;
}

async function loadSpeciesTraitItems(species) {
  const parentSpecies = { drow: "elf", duergar: "dwarf", deepGnome: "gnome" }[species];
  const allowedSpecies = new Set([species, parentSpecies].filter(Boolean));
  const result = [];
  for (const id of configuredContentPacks()) {
    const pack = game.packs.get(id);
    if (!pack || pack.documentName !== "Item") continue;
    const docs = await pack.getDocuments();
    for (const item of docs) {
      const library = item.getFlag(MODULE_ID, "library");
      if (library?.kind !== "species-trait" || ![].concat(library.species ?? []).some((key) => allowedSpecies.has(key))) continue;
      const data = item.toObject();
      delete data._id;
      data.flags ??= {};
      data.flags[MODULE_ID] = { ...(data.flags[MODULE_ID] ?? {}), generated: true, kind: "content", sourceUuid: item.uuid };
      result.push(data);
    }
  }
  return result;
}
