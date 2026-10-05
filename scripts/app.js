import {
  ABILITIES,
  CR_KEYS,
  DAMAGE_TYPES,
  DIE_SIZES,
  MODULE_ID,
  MODULE_TITLE,
  RIDERS,
  WEAPONS
} from "./constants.js";
import {
  applyPlan,
  getActorCombatProfile,
  getExistingOffensiveItems,
  getGeneratedItems,
  removeGeneratedItems,
  resolveTargetActor,
  undoLastOperation
} from "./actor-service.js";
import { applyRecommendedAttacks, buildDamagePlan, getCrStats, mergeDefaults } from "./engine.js";

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
  return {
    actor: {
      name: actor.name,
      cr: getCrStats(config.cr).cr,
      generated: generated.length,
      existingOffense: existingOffense.length,
      existingOffenseNames: existingOffense.slice(0, 6).map((item) => item.name).join(", "),
      existingOffenseMore: Math.max(0, existingOffense.length - 6),
      hasUndo: Boolean(actor.getFlag(MODULE_ID, "lastOperation")),
      hasLegacyData: Boolean(actor.getFlag("world", "monsterForgeData"))
    },
    integration: {
      midiActive,
      daeActive,
      ready: midiActive && daeActive
    },
    config,
    crOptions: options(CR_KEYS.map((cr) => [cr, `CR ${cr}`]), config.cr),
    damageAdjustmentOptions: options([
      [-20, "−20% DPR"],
      [-10, "−10% DPR"],
      [0, "Published DPR"],
      [10, "+10% DPR"],
      [20, "+20% DPR"]
    ], config.roleModifier),
    accuracyOptions: options([
      ["actor", "Use actor ability + proficiency"],
      ["cr", "Use flat Forge of Foes attack bonus"]
    ], config.accuracyMode),
    saveDcOptions: options([
      ["cr", "Use flat Forge of Foes save DC"],
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

function updatePreview(root, actor) {
  const form = root.querySelector("form") ?? root.closest("form") ?? root;
  const config = parseForgeForm(form);
  const profile = getActorCombatProfile(actor);
  const existingOffense = getExistingOffensiveItems(actor);
  const midiReady = Boolean(game.modules?.get?.("midi-qol")?.active && game.modules?.get?.("dae")?.active);
  const plan = buildDamagePlan(config, profile);

  toggle(root, "[data-panel='secondary']", config.secondaryEnabled);
  toggle(root, "[data-field='split']", config.secondaryEnabled);
  toggle(root, "[data-panel='tertiary']", config.tertiary.enabled);
  toggle(root, "[data-custom='primary']", config.primary.weaponKey === "custom");
  toggle(root, "[data-custom='secondary']", config.secondary.weaponKey === "custom");
  toggle(root, "[data-rider-save='primary']", config.primary.rider !== "none");
  toggle(root, "[data-rider-save='secondary']", config.secondary.rider !== "none");
  toggle(root, "[data-tertiary-dc]", config.tertiary.saveAbility !== "none" && config.saveDcMode === "actor");

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
  setText(root, "[data-preview='fof-hp']", plan.stats.hp);
  setText(root, "[data-preview='actor-ac']", profile.ac || "—");
  setText(root, "[data-preview='fof-ac']", plan.stats.ac);
  setText(root, "[data-preview='actor-attack']", accuracy);
  setText(root, "[data-preview='fof-attack']", `+${plan.stats.attackBonus}`);
  setText(root, "[data-preview='actor-dc']", saveDc);
  setText(root, "[data-preview='fof-dc']", `DC ${plan.stats.saveDc}`);

  const varianceCard = root.querySelector("[data-metric='achieved']");
  varianceCard?.classList.toggle("is-warning", Math.abs(plan.variance) > Math.max(2, plan.target * 0.1));

  const warnings = root.querySelector("[data-preview='warnings']");
  if (warnings) {
    warnings.replaceChildren();
    const previewWarnings = [...plan.warnings];
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
      if (result.undone) ui.notifications.info(`Monster Forge: removed ${result.removed} and restored ${result.restored} item(s).`);
      else ui.notifications.warn(result.reason);
      refreshManagementState(root, actor);
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
    let config = mergeDefaults(saved, actorCr(actor));
    if (config.followCrAttacks) config = applyRecommendedAttacks(config, config.cr);
    const context = buildContext(actor, config);
    const render = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
    const content = await render(`modules/${MODULE_ID}/templates/forge-dialog.hbs`, context);

    return foundry.applications.api.DialogV2.wait({
      id: `${MODULE_ID}-dialog`,
      window: { title: `${MODULE_TITLE}: ${actor.name}`, icon: "fa-solid fa-hammer" },
      position: { width: 760, height: "auto" },
      content,
      rejectClose: false,
      render: (event, dialog) => attachListeners(event, dialog, actor),
      buttons: [
        {
          action: "apply",
          label: "Forge attacks",
          icon: "fa-solid fa-hammer",
          default: true,
          callback: async (_event, button) => {
            try {
              const parsed = parseForgeForm(button.form);
              const plan = buildDamagePlan(parsed, getActorCombatProfile(actor));
              await game.settings.set(MODULE_ID, "defaults", plan.config);
              const result = await applyPlan(actor, plan);
              ui.notifications.info(`Monster Forge added ${result.created.length} item(s) to ${actor.name}${result.replaced ? ` and replaced ${result.replaced}` : ""}.`);
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
