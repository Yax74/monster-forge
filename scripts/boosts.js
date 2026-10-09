import { MODULE_ID, MODULE_VERSION } from "./constants.js";

const BOOST_FOLDER = /^\s*npc boosts?\s*$/i;
const RANKS = Object.freeze({ I: 1, II: 2, III: 3 });
const RANK_LABELS = Object.freeze({ 1: "I", 2: "II", 3: "III" });
const CASTER_PROGRESSIONS = Object.freeze({
  "NPC Quarter Caster": { label: "Quarter caster", order: 1 },
  "NPC Half Caster": { label: "Half caster", order: 2 },
  "NPC Full Caster": { label: "Full caster", order: 3 }
});
const CONFLICTING_ITEMS = Object.freeze({
  "NPC Hitpoints": "Monster Forge already sets the FoF-based HP foundation.",
  "Damage per Round": "Monster Forge already budgets FoF DPR and generated attacks.",
  "CR Boost": "Changing CR after the foundation would invalidate every benchmark.",
  "Minion 15 HP Lock": "Monster Forge's Minion tier already calculates and previews HP."
});

function clone(value) {
  if (value === undefined) return undefined;
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return structuredClone(value);
}

function collectionValues(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (typeof collection.values === "function") return [...collection.values()];
  return Object.values(collection);
}

function entryValue(entry, path) {
  return path.split(".").reduce((value, key) => value?.[key], entry);
}

function folderId(value) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id ?? value._id ?? null;
}

function packFolders(pack) {
  const folders = collectionValues(pack?.folders);
  const worldFolders = collectionValues(globalThis.game?.folders)
    .filter((folder) => folder?.pack === pack?.collection);
  const unique = new Map();
  for (const folder of [...folders, ...worldFolders]) {
    const id = folderId(folder);
    if (id) unique.set(id, folder);
  }
  return unique;
}

function folderLineage(pack, entry) {
  const folders = packFolders(pack);
  const names = [];
  const visited = new Set();
  let id = folderId(entry?.folder);
  while (id && !visited.has(id)) {
    visited.add(id);
    const folder = folders.get(id);
    if (!folder) break;
    if (folder.name) names.push(String(folder.name));
    id = folderId(folder.folder ?? folder.parent);
  }
  return names;
}

function explicitBoost(entry) {
  const value = entryValue(entry, `flags.${MODULE_ID}.boost`);
  return value === true || value?.enabled === true;
}

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

export function parseBoostVariant(name) {
  const text = String(name ?? "").trim();
  const caster = CASTER_PROGRESSIONS[text];
  if (caster) {
    return {
      family: "Caster Progression",
      rank: caster.order,
      rankLabel: caster.label,
      kind: "caster"
    };
  }

  const match = text.match(/^(.*?)(?:\s+(I{1,3}|[1-3]))$/i);
  if (!match) return { family: text || "Unnamed Boost", rank: null, rankLabel: null, kind: "boost" };
  const rawRank = match[2].toUpperCase();
  const rank = RANKS[rawRank] ?? Number(rawRank);
  return {
    family: match[1].trim() || text,
    rank,
    rankLabel: `Rank ${RANK_LABELS[rank] ?? rank}`,
    kind: "boost"
  };
}

function packId(pack) {
  return String(pack?.collection ?? pack?.metadata?.id ?? "");
}

function packLabel(pack) {
  return String(pack?.metadata?.label ?? pack?.title ?? packId(pack));
}

function entryId(entry) {
  return String(entry?._id ?? entry?.id ?? "");
}

function entryUuid(pack, entry) {
  return entry?.uuid ?? `Compendium.${packId(pack)}.Item.${entryId(entry)}`;
}

export function describeBoostEntry(pack, entry) {
  const variant = parseBoostVariant(entry?.name);
  const name = String(entry?.name ?? "Unnamed Boost");
  const conflictReason = CONFLICTING_ITEMS[name] ?? null;
  return {
    uuid: entryUuid(pack, entry),
    packId: packId(pack),
    packLabel: packLabel(pack),
    itemId: entryId(entry),
    name,
    img: entry?.img ?? "icons/svg/aura.svg",
    summary: stripHtml(entryValue(entry, "system.description.value")),
    family: variant.family,
    rank: variant.rank,
    rankLabel: variant.rankLabel,
    kind: variant.kind,
    selectable: !conflictReason,
    conflictReason
  };
}

function isCandidate(pack, entry) {
  const name = String(entry?.name ?? "");
  const inBoostFolder = folderLineage(pack, entry).some((folder) => BOOST_FOLDER.test(folder));
  return explicitBoost(entry) || inBoostFolder || Object.hasOwn(CASTER_PROGRESSIONS, name);
}

export async function discoverBoostCatalog(packs = globalThis.game?.packs) {
  const itemPacks = collectionValues(packs)
    .filter((pack) => pack?.documentName === "Item" || pack?.metadata?.type === "Item");
  const entriesByUuid = new Map();
  const warnings = [];

  const results = await Promise.all(itemPacks.map(async (pack) => {
    try {
      const index = await pack.getIndex({
        fields: [
          "name",
          "type",
          "folder",
          "img",
          "system.description.value",
          `flags.${MODULE_ID}.boost`
        ]
      });
      return collectionValues(index)
        .filter((entry) => isCandidate(pack, entry))
        .map((entry) => describeBoostEntry(pack, entry));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`${packLabel(pack)} could not be indexed: ${message}`);
      return [];
    }
  }));

  for (const entries of results) {
    for (const entry of entries) entriesByUuid.set(entry.uuid, entry);
  }

  const entries = [...entriesByUuid.values()];
  entries.sort((left, right) =>
    left.packLabel.localeCompare(right.packLabel)
    || left.family.localeCompare(right.family)
    || (left.rank ?? 99) - (right.rank ?? 99)
    || left.name.localeCompare(right.name));

  return { entries, warnings };
}

export function normalizeBoostConfig(input = {}) {
  const source = input.boosts ?? input;
  const selected = Array.isArray(source?.selected) ? source.selected : [];
  return {
    selected: [...new Set(selected
      .map((uuid) => String(uuid ?? "").trim())
      .filter((uuid) => uuid.startsWith("Compendium.")))]
      .slice(0, 24)
  };
}

export function buildBoostGroups(catalog = { entries: [] }, selected = []) {
  const selectedSet = new Set(selected);
  const groups = new Map();
  const blocked = [];

  for (const entry of catalog.entries ?? []) {
    if (!entry.selectable) {
      blocked.push(entry);
      continue;
    }
    const key = `${entry.packId}::${entry.family}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: entry.family,
        packLabel: entry.packLabel,
        kind: entry.kind,
        options: []
      });
    }
    groups.get(key).options.push({
      value: entry.uuid,
      label: entry.rankLabel ?? entry.name,
      name: entry.name,
      summary: entry.summary,
      order: entry.rank ?? 99,
      selected: selectedSet.has(entry.uuid)
    });
  }

  return {
    groups: [...groups.values()].map((group) => {
      const sortedOptions = group.options.sort((left, right) => left.order - right.order || left.label.localeCompare(right.label));
      const selectedValue = sortedOptions.find((option) => option.selected)?.value ?? "";
      const options = sortedOptions.map((option) => ({
        ...option,
        selected: option.value === selectedValue
      }));
      const ranks = new Set(options.map((option) => option.order).filter((rank) => rank >= 1 && rank <= 3));
      const missingRanks = ranks.size ? [1, 2, 3].filter((rank) => !ranks.has(rank)) : [];
      return {
        ...group,
        selectedValue,
        options,
        rankNote: missingRanks.length
          ? `Source is missing rank${missingRanks.length === 1 ? "" : "s"} ${missingRanks.map((rank) => RANK_LABELS[rank]).join(", ")}`
          : ""
      };
    }),
    blocked
  };
}

export function selectBoosts(config = {}, catalog = { entries: [] }) {
  const normalized = normalizeBoostConfig(config);
  const byUuid = new Map((catalog.entries ?? []).map((entry) => [entry.uuid, entry]));
  const selected = [];
  const selectedFamilies = new Set();
  const warnings = [...(catalog.warnings ?? [])];

  for (const uuid of normalized.selected) {
    const entry = byUuid.get(uuid);
    if (!entry) {
      warnings.push(`A previously selected boost is no longer available: ${uuid}`);
      continue;
    }
    if (!entry.selectable) {
      warnings.push(`${entry.name} was not selected because it conflicts with the FoF foundation: ${entry.conflictReason}`);
      continue;
    }
    const familyKey = `${entry.packId}::${entry.family}`;
    if (selectedFamilies.has(familyKey)) {
      warnings.push(`${entry.name} was skipped because another rank from ${entry.family} is already selected.`);
      continue;
    }
    selectedFamilies.add(familyKey);
    selected.push(entry);
  }

  return { config: normalized, selected, warnings };
}

export async function resolveBoostSources(entries = [], resolver = globalThis.fromUuid) {
  if (!entries.length) return [];
  if (typeof resolver !== "function") throw new Error("Foundry's UUID resolver is unavailable.");
  const sources = [];
  for (const entry of entries) {
    const document = await resolver(entry.uuid);
    if (!document || document.documentName !== "Item") {
      throw new Error(`Boost item is unavailable: ${entry.name} (${entry.uuid}).`);
    }
    sources.push({
      uuid: entry.uuid,
      name: entry.name,
      data: document.toObject()
    });
  }
  return sources;
}

export function prepareBoostItemData(source, { setId }) {
  const data = clone(source?.data ?? source);
  if (!data || typeof data !== "object") throw new Error("Boost source data is invalid.");
  delete data._id;
  delete data._stats;
  delete data.folder;
  delete data.ownership;
  delete data.sort;
  data.flags = {
    ...(data.flags ?? {}),
    [MODULE_ID]: {
      ...(data.flags?.[MODULE_ID] ?? {}),
      generated: true,
      version: MODULE_VERSION,
      setId,
      kind: "boost",
      role: "boost",
      sourceUuid: source?.uuid ?? null
    }
  };
  return data;
}
