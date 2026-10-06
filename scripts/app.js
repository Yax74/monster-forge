import {
  ABILITIES,
  ACTOR_SIZES,
  COMBAT_ROLES,
  CR_KEYS,
  CREATURE_TIERS,
  DAMAGE_TYPES,
  DIE_SIZES,
  MODULE_ID,
  MODULE_TITLE,
  RIDERS,
  SPECIES_PROFILES,
  WEAPONS
} from "./constants.js";
import {
  applyFoundationPlan,
  applyPlan,
  getActorCombatProfile,
  getExistingOffensiveItems,
  getGeneratedItems,
  removeGeneratedItems,
  resolveTargetActor,
  undoLastOperation
} from "./actor-service.js";
import { applyRecommendedAttacks, buildDamagePlan, getCrStats, mergeDefaults } from "./engine.js";
import {
  buildFoundationPlan,
  getEffectiveActorProfile,
  normalizeFoundationConfig
} from "./foundation.js";

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

function generatorSpecies(actor) {
  const species = actor.getFlag?.("wraeclast-npc-gen", "npc")?.species;
  if (!species) return null;
  const match = Object.entries(SPECIES_PROFILES)
    .find(([_key, profile]) => profile.label.toLowerCase() === String(species).toLowerCase());
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
    customDamageOptions: options(DAMAGE_TYPES.map((type) => [type, type[0].toUpperCase() + type.slice(1)]), attack.customDamageType ?? "slashing")
  };
}

function buildContext(actor, config) {
  const generated = getGeneratedItems(actor);
  const existingOffense = getExistingOffensiveItems(actor);
  const midiActive = Boolean(game.modules?.get?.("midi-qol")?.active);
  const daeActive = Boolean(game.modules?.get?.("dae")?.active);
  const importedSpecies = generatorSpecies(actor);
  const hasFoundation = Boolean(actor.getFlag(MODULE_ID, "foundation"));
  return {
    actor: {
      name: actor.name,
      cr: getCrStats(config.cr).cr,
      generated: generated.length,
      existingOffense: existingOffense.length,
      existingOffenseNames: existingOffense.slice(0, 6).map((item) => item.name).join(", "),
      existingOffenseMore: Math.max(0, existingOffense.length - 6),
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
        Object.entries(SPECIES_PROFILES).map(([key, species]) => [key, species.label]),
        config.foundation.species
      ),
      hpPolicyOptions: options([
        ["ratio", "Preserve current HP percentage"],
        ["full", "Set current HP to full"]
      ], config.foundation.hpPolicy),
      sizeOptions: options([
        ["", "Use species / preserve actor"],
        ...Object.entries(ACTOR_SIZES)
      ], config.foundation.overrides.size)
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
    customDamageType: field(formData, `${prefix}.customDamageType`, "slashing")
  };
}

export function parseForgeForm(form) {
  const data = new FormData(form);
  return {
    cr: field(data, "cr", "0"),
    foundation: {
      mode: field(data, "foundation.mode", "apply"),
      role: field(data, "foundation.role", "balanced"),
      tier: field(data, "foundation.tier", "standard"),
      species: field(data, "foundation.species", "preserve"),
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
    roleModifier: numberField(data, "roleModifier", 0),
    followCrAttacks: data.has("followCrAttacks"),
    accuracyMode: field(data, "accuracyMode", "actor"),
    saveDcMode: field(data, "saveDcMode", "cr"),
    riderAutomation: field(data, "riderAutomation", "midi"),
    applyMode: field(data, "applyMode", "replace"),
    secondaryEnabled: data.has("secondaryEnabled"),
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

function signed(value) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function buildForgePlan(config, actor) {
  const actorProfile = getActorCombatProfile(actor);
  const foundation = buildFoundationPlan(config, actorProfile);
  const effectiveProfile = getEffectiveActorProfile(foundation, actorProfile);
  const plan = buildDamagePlan({
    ...config,
    foundation: foundation.config
  }, effectiveProfile, foundation.final);
  plan.foundation = foundation;
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

function updatePreview(root, actor) {
  const form = root.querySelector("form") ?? root.closest("form") ?? root;
  const config = parseForgeForm(form);
  const { actorProfile: profile, foundation, plan } = buildForgePlan(config, actor);
  const existingOffense = getExistingOffensiveItems(actor);
  const midiReady = Boolean(game.modules?.get?.("midi-qol")?.active && game.modules?.get?.("dae")?.active);

  toggle(root, "[data-panel='secondary']", config.secondaryEnabled);
  toggle(root, "[data-field='split']", config.secondaryEnabled);
  toggle(root, "[data-panel='tertiary']", config.tertiary.enabled);
  toggle(root, "[data-custom='primary']", config.primary.weaponKey === "custom");
  toggle(root, "[data-custom='secondary']", config.secondary.weaponKey === "custom");
  toggle(root, "[data-rider-save='primary']", config.primary.rider !== "none");
  toggle(root, "[data-rider-save='secondary']", config.secondary.rider !== "none");
  toggle(root, "[data-tertiary-dc]", config.tertiary.saveAbility !== "none" && config.saveDcMode === "actor");
  toggle(root, "[data-foundation-apply]", foundation.config.mode === "apply");

  setText(root, "[data-preview='baseline']", plan.stats.dpr);
  setText(root, "[data-preview='target']", plan.target);
  setText(root, "[data-preview='achieved']", plan.achieved);
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
  setText(root, "[data-preview='foundation-mode']", foundation.config.mode === "apply" ? "Will update actor" : "Preview only");
  setText(root, "[data-preview='foundation-role']", `${foundation.role.label} · ${foundation.role.description}`);
  setText(root, "[data-preview='foundation-tier']", `${foundation.tier.label} · ${foundation.tier.description}`);
  setText(root, "[data-preview='foundation-species']", foundation.sources.species);
  setText(root, "[data-preview='foundation-source']", `${foundation.sources.baseline} · ${foundation.sources.role} · ${foundation.sources.tier}`);
  setText(root, "[data-preview='foundation-abilities']", abilitySummary(foundation.abilities));
  setText(root, "[data-preview='foundation-body']", bodySummary(foundation.body));
  setText(root, "[data-preview='foundation-cr']", `${profile.cr ?? "—"} → ${foundation.stats.cr}`);
  setText(root, "[data-preview='foundation-hp']", `${profile.hp || "—"} → ${foundation.final.hp}`);
  setText(root, "[data-preview='foundation-ac']", `${profile.ac || "—"} → ${foundation.final.ac}`);
  setText(root, "[data-preview='foundation-offense']", `${signed(foundation.final.attackBonus)} / DC ${foundation.final.saveDc} / ${plan.target} DPR`);

  const varianceCard = root.querySelector("[data-metric='achieved']");
  varianceCard?.classList.toggle("is-warning", Math.abs(plan.variance) > Math.max(2, plan.target * 0.1));

  const warnings = root.querySelector("[data-preview='warnings']");
  if (warnings) {
    warnings.replaceChildren();
    const previewWarnings = [...foundation.warnings, ...plan.warnings];
    if (foundation.config.mode === "audit") {
      previewWarnings.push("Foundation mode is Preview only: actor CR, defenses, abilities, and body data will not be changed, and actor-derived attacks will continue to use the current actor profile.");
    }
    if (foundation.config.mode === "apply" && !foundation.config.manage.abilities && config.accuracyMode === "actor") {
      previewWarnings.push("Ability management is off, so actor-derived attack bonuses may not reach the selected foundation benchmark.");
    }
    if (existingOffense.length) {
      previewWarnings.push(`${existingOffense.length} existing offensive item(s) are not included in this generated DPR budget.`);
    }
    const hasRider = config.primary.rider !== "none" || (config.secondaryEnabled && config.secondary.rider !== "none");
    if (config.riderAutomation === "midi" && hasRider && !midiReady) {
      previewWarnings.push("Midi-QOL rider automation is selected, but both Midi-QOL and DAE must be active for automatic save chaining and condition application.");
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

function attachListeners(_event, dialog, actor) {
  const root = dialog.element;
  const form = dialog.form ?? root.querySelector("form");
  if (!form) return;
  const preview = () => updatePreview(root, actor);
  const syncRecommendation = () => {
    const recommended = applyRecommendedAttacks(parseForgeForm(form));
    const secondary = form.elements.namedItem("secondaryEnabled");
    const primaryCount = form.elements.namedItem("primary.count");
    const secondaryCount = form.elements.namedItem("secondary.count");
    if (secondary) secondary.checked = recommended.secondaryEnabled;
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
    const follow = form.elements.namedItem("followCrAttacks");
    const shouldSync = follow?.checked && ["cr", "secondaryEnabled", "splitPrimary", "followCrAttacks"].includes(event.target?.name);
    if (shouldSync) syncRecommendation();
    preview();
  });

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

  preview();
}

export async function openForge(targetActor = null) {
  try {
    if (game.system.id !== "dnd5e") throw new Error("Monster Forge requires the D&D5e game system.");
    const actor = targetActor ?? resolveTargetActor();
    if (actor.type !== "npc") throw new Error(`${actor.name} is not an NPC actor.`);
    if (!actor.isOwner) throw new Error(`You do not have permission to edit ${actor.name}.`);

    const saved = game.settings.get(MODULE_ID, "defaults") ?? {};
    const actorFoundation = actor.getFlag(MODULE_ID, "foundation")?.config;
    const importedSpecies = generatorSpecies(actor);
    const rememberedFoundation = actorFoundation
      ? { ...(saved.foundation ?? {}), ...actorFoundation }
      : importedSpecies
        ? { ...(saved.foundation ?? {}), species: importedSpecies.key }
        : saved.foundation;
    const remembered = rememberedFoundation
      ? { ...saved, foundation: rememberedFoundation }
      : saved;
    let config = mergeDefaults(remembered, actorCr(actor));
    config.foundation = normalizeFoundationConfig(config);
    if (config.followCrAttacks) config = applyRecommendedAttacks(config, config.cr);
    const context = buildContext(actor, config);
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
          label: "Apply foundation only",
          icon: "fa-solid fa-shield-halved",
          callback: async (_event, button) => {
            try {
              const parsed = parseForgeForm(button.form);
              const { foundation, plan } = buildForgePlan(parsed, actor);
              await game.settings.set(MODULE_ID, "defaults", plan.config);
              const result = await applyFoundationPlan(actor, foundation);
              ui.notifications.info(`Monster Forge applied ${result.updatedFields} foundation field(s) to ${actor.name}.`);
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
              await game.settings.set(MODULE_ID, "defaults", plan.config);
              const result = await applyPlan(actor, plan);
              const actorText = result.actorUpdated ? " and applied its NPC foundation" : "";
              ui.notifications.info(`Monster Forge added ${result.created.length} item(s) to ${actor.name}${actorText}${result.replaced ? ` and replaced ${result.replaced}` : ""}.`);
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
