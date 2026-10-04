import { MODULE_ID } from "./constants.js";
import { buildMultiattackItem, buildTertiaryItem, buildWeaponItem } from "./item-builder.js";

const LAST_OPERATION_FLAG = "lastOperation";

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return structuredClone(value);
}

function randomId() {
  return foundry.utils.randomID();
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
  const createdIds = [];
  let priorDeleted = false;

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

    await actor.setFlag(MODULE_ID, LAST_OPERATION_FLAG, {
      timestamp: Date.now(),
      action: "apply",
      mode: plan.config.applyMode,
      createdIds,
      previousItems: priorData,
      previousLegacyOperation
    });
    if (previousLegacyOperation) {
      await actor.unsetFlag("world", "monsterForgeData").catch((error) => {
        console.warn(`${MODULE_ID} | Generated items were migrated, but the old macro actor flag could not be cleared.`, error);
      });
    }

    return { created: [...weapons, ...features], replaced: priorItems.length };
  } catch (error) {
    const survivingCreatedIds = createdIds.filter((id) => actor.items.get(id));
    if (survivingCreatedIds.length) {
      await actor.deleteEmbeddedDocuments("Item", survivingCreatedIds).catch(() => {});
    }
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
  if (operation.previousLegacyOperation) {
    await actor.setFlag("world", "monsterForgeData", operation.previousLegacyOperation);
  }
  await actor.unsetFlag(MODULE_ID, LAST_OPERATION_FLAG);
  return { undone: true, removed: createdIds.length, restored: restored.length };
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
