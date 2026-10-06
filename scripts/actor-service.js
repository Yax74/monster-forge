import { ABILITIES, MODULE_ID, MODULE_VERSION } from "./constants.js";
import { buildMultiattackItem, buildTertiaryItem, buildWeaponItem } from "./item-builder.js";
import { crToNumber } from "./engine.js";

const LAST_OPERATION_FLAG = "lastOperation";
const FOUNDATION_FLAG = "foundation";

function clone(value) {
  if (value === undefined) return undefined;
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return structuredClone(value);
}

function randomId() {
  return foundry.utils.randomID();
}

function getProperty(object, path) {
  if (globalThis.foundry?.utils?.getProperty) return foundry.utils.getProperty(object, path);
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function hasProperty(object, path) {
  if (globalThis.foundry?.utils?.hasProperty) return foundry.utils.hasProperty(object, path);
  const keys = path.split(".");
  let value = object;
  for (const key of keys) {
    if (value === null || value === undefined || !Object.hasOwn(Object(value), key)) return false;
    value = value[key];
  }
  return true;
}

function actorSource(actor) {
  if (actor._source) return actor._source;
  if (actor.toObject) return actor.toObject();
  return { system: actor.system ?? {} };
}

function currentCr(actor) {
  const cr = actor.system?.details?.cr;
  return cr?.value ?? cr ?? 0;
}

function movementPath(actor) {
  return actor.system?.attributes?.movement?.speeds
    ? "system.attributes.movement.speeds.walk"
    : "system.attributes.movement.walk";
}

function darkvisionPath(actor) {
  return actor.system?.attributes?.senses?.ranges
    ? "system.attributes.senses.ranges.darkvision"
    : "system.attributes.senses.darkvision";
}

function crPath(actor) {
  return typeof actor.system?.details?.cr === "object"
    ? "system.details.cr.value"
    : "system.details.cr";
}

function captureActorValues(actor, update) {
  const source = actorSource(actor);
  return Object.fromEntries(Object.keys(update).map((path) => [path, {
    exists: hasProperty(source, path),
    value: clone(getProperty(source, path))
  }]));
}

function restoreUpdate(snapshot = {}) {
  const update = {};
  for (const [path, entry] of Object.entries(snapshot)) {
    if (entry.exists) {
      update[path] = clone(entry.value);
      continue;
    }
    const parts = path.split(".");
    const key = parts.pop();
    update[`${parts.join(".")}.-=${key}`] = null;
  }
  return update;
}

async function restoreFoundationFlag(actor, previous) {
  if (previous === null || previous === undefined) {
    await actor.unsetFlag(MODULE_ID, FOUNDATION_FLAG);
  } else {
    await actor.setFlag(MODULE_ID, FOUNDATION_FLAG, clone(previous));
  }
}

function foundationFlagData(foundation) {
  return {
    version: MODULE_VERSION,
    timestamp: Date.now(),
    cr: foundation.stats.cr,
    proficiency: foundation.proficiency,
    config: clone(foundation.config),
    derived: clone(foundation.derived),
    final: clone(foundation.final),
    abilities: clone(foundation.abilities),
    attackAbilities: clone(foundation.attackAbilities),
    saveAbilities: clone(foundation.saveAbilities),
    body: clone(foundation.body),
    sources: clone(foundation.sources)
  };
}

export function isGeneratedItem(item) {
  return Boolean(item.getFlag?.(MODULE_ID, "generated") || item.getFlag?.("world", "monsterForge"));
}

export function getGeneratedItems(actor) {
  return actor.items.filter(isGeneratedItem);
}

export function getAbilityMods(actor) {
  return Object.fromEntries(
    Object.entries(actor.system?.abilities ?? {}).map(([key, value]) => [key, Number(value?.mod) || 0])
  );
}

export function getActorCombatProfile(actor) {
  const hp = actor.system?.attributes?.hp ?? {};
  const abilityScores = Object.fromEntries(
    Object.entries(actor.system?.abilities ?? {}).map(([key, value]) => [key, Number(value?.value) || 10])
  );
  const speed = getProperty(actor, movementPath(actor).replace(/^system\./, "system."));
  const darkvision = getProperty(actor, darkvisionPath(actor).replace(/^system\./, "system."));
  return {
    abilityMods: getAbilityMods(actor),
    abilityScores,
    proficiency: Number(actor.system?.attributes?.prof) || 0,
    cr: currentCr(actor),
    hpValue: Number(hp.value) || 0,
    hp: Number(hp.max ?? hp.value) || 0,
    ac: Number(actor.system?.attributes?.ac?.value) || 0,
    spellDc: Number(actor.system?.attributes?.spelldc) || null,
    speed: Number(speed) || 0,
    darkvision: Number(darkvision) || 0,
    size: actor.system?.traits?.size ?? null
  };
}

/** Build a version-aware D&D5e actor update without mutating the actor. */
export function buildFoundationActorUpdate(actor, foundation) {
  if (!foundation || foundation.config.mode !== "apply") return {};
  const update = { [crPath(actor)]: crToNumber(foundation.stats.cr) };

  if (foundation.config.manage.hp) {
    const oldMax = Number(actor.system?.attributes?.hp?.max ?? actor.system?.attributes?.hp?.value) || 0;
    const oldValue = Number(actor.system?.attributes?.hp?.value) || 0;
    const nextMax = Math.max(1, Math.round(foundation.final.hp));
    const ratio = oldMax > 0 ? oldValue / oldMax : 1;
    update["system.attributes.hp.max"] = nextMax;
    update["system.attributes.hp.value"] = foundation.config.hpPolicy === "full"
      ? nextMax
      : Math.max(0, Math.min(nextMax, Math.round(nextMax * ratio)));
  }

  if (foundation.config.manage.ac) {
    if (Object.hasOwn(actor.system?.attributes?.ac ?? {}, "override")) {
      update["system.attributes.ac.override"] = foundation.final.ac;
    } else {
      update["system.attributes.ac.calc"] = "natural";
      update["system.attributes.ac.flat"] = foundation.final.ac;
    }
  }

  if (foundation.config.manage.abilities) {
    for (const ability of ABILITIES) {
      update[`system.abilities.${ability}.value`] = foundation.abilities[ability];
    }
  }

  if (foundation.config.manage.body) {
    if (foundation.body.size) update["system.traits.size"] = foundation.body.size;
    if (foundation.body.speed !== null) update[movementPath(actor)] = foundation.body.speed;
    if (foundation.body.darkvision !== null) update[darkvisionPath(actor)] = foundation.body.darkvision;
  }

  return update;
}

export async function applyFoundationPlan(actor, foundation) {
  assertWritableNpc(actor);
  if (!foundation || foundation.config.mode !== "apply") {
    throw new Error("Switch Foundation behavior to Apply before applying foundation statistics.");
  }
  const update = buildFoundationActorUpdate(actor, foundation);
  const previousActorValues = captureActorValues(actor, update);
  const previousFoundation = actor.getFlag(MODULE_ID, FOUNDATION_FLAG) ?? null;
  let actorUpdated = false;
  let foundationFlagUpdated = false;

  try {
    await actor.update(update);
    actorUpdated = true;
    await actor.setFlag(MODULE_ID, FOUNDATION_FLAG, foundationFlagData(foundation));
    foundationFlagUpdated = true;
    await actor.setFlag(MODULE_ID, LAST_OPERATION_FLAG, {
      timestamp: Date.now(),
      action: "foundation",
      mode: "foundation",
      createdIds: [],
      previousItems: [],
      previousLegacyOperation: null,
      previousActorValues,
      previousFoundation
    });
    return { actorUpdated: true, updatedFields: Object.keys(update).length };
  } catch (error) {
    if (actorUpdated) await actor.update(restoreUpdate(previousActorValues)).catch(() => {});
    if (foundationFlagUpdated) await restoreFoundationFlag(actor, previousFoundation).catch(() => {});
    throw error;
  }
}

function activityValues(item) {
  const activities = item.system?.activities;
  if (!activities) return [];
  if (typeof activities.values === "function") return [...activities.values()];
  return Object.values(activities);
}

function hasDamageParts(activity) {
  const parts = activity?.damage?.parts;
  if (Array.isArray(parts)) return parts.length > 0;
  return Boolean(parts?.size);
}

export function getExistingOffensiveItems(actor) {
  return actor.items.filter((item) => {
    if (isGeneratedItem(item)) return false;
    const activities = activityValues(item);
    if (activities.some((activity) => activity.type === "attack" || hasDamageParts(activity))) return true;

    const baseDamage = item.system?.damage?.base;
    const baseDice = Number(baseDamage?.number) || 0;
    return baseDice > 0 || Boolean(baseDamage?.custom?.formula);
  });
}

function assertWritableNpc(actor) {
  if (!actor) throw new Error("Select one NPC token or open an NPC sheet first.");
  if (actor.type !== "npc") throw new Error(`${actor.name} is not an NPC actor.`);
  if (!actor.isOwner) throw new Error(`You do not have permission to edit ${actor.name}.`);
}

async function restoreItems(actor, itemData) {
  if (!itemData?.length) return [];
  try {
    return await actor.createEmbeddedDocuments("Item", clone(itemData), { keepId: true });
  } catch (error) {
    console.warn(`${MODULE_ID} | Could not restore original embedded IDs; restoring with new IDs.`, error);
    const withoutIds = clone(itemData).map((item) => {
      delete item._id;
      return item;
    });
    return actor.createEmbeddedDocuments("Item", withoutIds);
  }
}

export async function applyPlan(actor, plan) {
  assertWritableNpc(actor);
  const replacing = plan.config.applyMode === "replace";
  const priorItems = replacing ? getGeneratedItems(actor) : [];
  const priorData = priorItems.map((item) => item.toObject());
  const previousLegacyOperation = replacing
    ? actor.getFlag("world", "monsterForgeData") ?? null
    : null;
  const foundationUpdate = buildFoundationActorUpdate(actor, plan.foundation);
  const previousActorValues = captureActorValues(actor, foundationUpdate);
  const previousFoundation = actor.getFlag(MODULE_ID, FOUNDATION_FLAG) ?? null;
  const createdIds = [];
  let priorDeleted = false;
  let actorUpdated = false;
  let foundationFlagUpdated = false;

  try {
    if (priorItems.length) {
      await actor.deleteEmbeddedDocuments("Item", priorItems.map((item) => item.id));
      priorDeleted = true;
    }

    const setId = randomId();
    const buildOptions = { idFactory: randomId, setId };
    const weaponData = [
      buildWeaponItem(plan.primary, plan, { ...buildOptions, role: "primary" })
    ];
    if (plan.secondary) {
      weaponData.push(buildWeaponItem(plan.secondary, plan, { ...buildOptions, role: "secondary" }));
    }

    const weapons = await actor.createEmbeddedDocuments("Item", weaponData);
    createdIds.push(...weapons.map((item) => item.id));

    const featureData = [];
    const tertiary = buildTertiaryItem(plan, buildOptions);
    if (tertiary) featureData.push(tertiary);
    featureData.push(buildMultiattackItem(plan, weapons, buildOptions));

    const features = await actor.createEmbeddedDocuments("Item", featureData);
    createdIds.push(...features.map((item) => item.id));

    if (Object.keys(foundationUpdate).length) {
      await actor.update(foundationUpdate);
      actorUpdated = true;
      await actor.setFlag(MODULE_ID, FOUNDATION_FLAG, foundationFlagData(plan.foundation));
      foundationFlagUpdated = true;
    }

    await actor.setFlag(MODULE_ID, LAST_OPERATION_FLAG, {
      timestamp: Date.now(),
      action: "apply",
      mode: plan.config.applyMode,
      createdIds,
      previousItems: priorData,
      previousLegacyOperation,
      previousActorValues,
      previousFoundation
    });
    if (previousLegacyOperation) {
      await actor.unsetFlag("world", "monsterForgeData").catch((error) => {
        console.warn(`${MODULE_ID} | Generated items were migrated, but the old macro actor flag could not be cleared.`, error);
      });
    }

    return {
      created: [...weapons, ...features],
      replaced: priorItems.length,
      actorUpdated: Object.keys(foundationUpdate).length > 0
    };
  } catch (error) {
    const survivingCreatedIds = createdIds.filter((id) => actor.items.get(id));
    if (survivingCreatedIds.length) {
      await actor.deleteEmbeddedDocuments("Item", survivingCreatedIds).catch(() => {});
    }
    if (actorUpdated) await actor.update(restoreUpdate(previousActorValues)).catch(() => {});
    if (foundationFlagUpdated) await restoreFoundationFlag(actor, previousFoundation).catch(() => {});
    if (priorDeleted) await restoreItems(actor, priorData).catch(() => {});
    throw error;
  }
}

export async function undoLastOperation(actor) {
  assertWritableNpc(actor);
  const operation = actor.getFlag(MODULE_ID, LAST_OPERATION_FLAG);
  if (!operation) return { undone: false, reason: "No Monster Forge operation is available to undo." };

  const createdIds = (operation.createdIds ?? []).filter((id) => actor.items.get(id));
  if (createdIds.length) await actor.deleteEmbeddedDocuments("Item", createdIds);
  const restored = await restoreItems(actor, operation.previousItems ?? []);
  const actorRestore = restoreUpdate(operation.previousActorValues ?? {});
  if (Object.keys(actorRestore).length) await actor.update(actorRestore);
  if (Object.hasOwn(operation, "previousFoundation")) {
    await restoreFoundationFlag(actor, operation.previousFoundation);
  }
  if (operation.previousLegacyOperation) {
    await actor.setFlag("world", "monsterForgeData", operation.previousLegacyOperation);
  }
  await actor.unsetFlag(MODULE_ID, LAST_OPERATION_FLAG);
  return {
    undone: true,
    removed: createdIds.length,
    restored: restored.length,
    actorRestored: Object.keys(actorRestore).length > 0
  };
}

export async function removeGeneratedItems(actor) {
  assertWritableNpc(actor);
  const generated = getGeneratedItems(actor);
  if (!generated.length) return { removed: 0 };
  const previousItems = generated.map((item) => item.toObject());
  const previousLegacyOperation = actor.getFlag("world", "monsterForgeData") ?? null;
  let deleted = false;
  try {
    await actor.deleteEmbeddedDocuments("Item", generated.map((item) => item.id));
    deleted = true;
    await actor.setFlag(MODULE_ID, LAST_OPERATION_FLAG, {
      timestamp: Date.now(),
      action: "remove",
      mode: "replace",
      createdIds: [],
      previousItems,
      previousLegacyOperation
    });
    if (previousLegacyOperation) {
      await actor.unsetFlag("world", "monsterForgeData").catch((error) => {
        console.warn(`${MODULE_ID} | Generated items were removed, but the old macro actor flag could not be cleared.`, error);
      });
    }
    return { removed: generated.length };
  } catch (error) {
    if (deleted) await restoreItems(actor, previousItems).catch(() => {});
    throw error;
  }
}

export function resolveTargetActor() {
  const controlled = canvas?.tokens?.controlled?.map((token) => token.actor).filter(Boolean) ?? [];
  if (controlled.length > 1) {
    throw new Error("Select exactly one NPC token before opening Monster Forge.");
  }
  if (controlled.length === 1) return controlled[0];

  const v1Windows = Object.values(ui?.windows ?? {})
    .filter((window) => window.document?.documentName === "Actor" && window.rendered);
  if (v1Windows.length) return v1Windows.at(-1).document;

  const v2Instances = globalThis.foundry?.applications?.instances;
  if (v2Instances?.values) {
    const actorSheets = [...v2Instances.values()]
      .filter((app) => app.document?.documentName === "Actor" && app.rendered);
    if (actorSheets.length) return actorSheets.at(-1).document;
  }

  throw new Error("Select one NPC token or open an NPC sheet first.");
}
