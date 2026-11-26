import { MODULE_ID, MODULE_VERSION } from "./constants.js";

const DEFAULT_OPEN_CATEGORIES = Object.freeze(["initiative", "movement", "defence"]);
const POWER_LABELS = Object.freeze({ light: "Light", standard: "Standard", strong: "Strong", major: "Major" });
const AUTOMATION_LABELS = Object.freeze({ core: "Core effect", activity: "Core activity", midi: "Midi/DAE optional", manual: "Manual feature" });

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function collectionValues(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (typeof collection.values === "function") return [...collection.values()];
  return Object.values(collection);
}

function itemLibrary(item) {
  try {
    const value = item?.getFlag?.(MODULE_ID, "library");
    if (value !== undefined) return value;
  } catch (_error) {
    // Read the stored flag if the module setting is not available yet.
  }
  return item?.flags?.[MODULE_ID]?.library ?? item?._source?.flags?.[MODULE_ID]?.library ?? null;
}

let catalogCategories = [];
let catalogGroups = [];
let catalogEntries = [];
let groupById = new Map();
let entryById = new Map();

/** Build the selectable boost catalog from tagged Item compendium documents. */
export function setBoostCatalogItems(items = []) {
  const valid = [];
  for (const item of collectionValues(items)) {
    const library = itemLibrary(item);
    if (library?.kind !== "boost" || library.template || !library.boost?.id || !library.category || !library.group) continue;
    valid.push({
      ...structuredClone(library.boost),
      id: String(library.boost.id),
      name: String(library.boost.name ?? item.name),
      img: item.img ?? library.categoryIcon ?? "icons/svg/aura.svg",
      groupId: String(library.group),
      groupLabel: String(library.groupLabel ?? library.group),
      groupHelp: String(library.groupHelp ?? ""),
      categoryId: String(library.category),
      categoryLabel: String(library.categoryLabel ?? library.category),
      categoryIcon: String(library.categoryIcon ?? "icons/svg/aura.svg"),
      categoryDescription: String(library.categoryDescription ?? ""),
      categorySort: Number(library.categorySort) || 0,
      groupSort: Number(library.groupSort) || 0,
      sort: Number(library.sort) || 0,
      exclusiveGroup: String(library.group),
      sourceUuid: item.uuid ?? null,
      requirements: Array.isArray(library.boost.requirements) ? library.boost.requirements : []
    });
  }
  valid.sort((a, b) => a.categorySort - b.categorySort || a.groupSort - b.groupSort || a.sort - b.sort || a.name.localeCompare(b.name));
  const categories = new Map();
  const groups = new Map();
  const entriesById = new Map();
  for (const entry of valid) {
    if (entriesById.has(entry.id)) continue;
    if (!categories.has(entry.categoryId)) categories.set(entry.categoryId, {
      id: entry.categoryId, label: entry.categoryLabel, icon: entry.categoryIcon,
      description: entry.categoryDescription, sort: entry.categorySort, groups: []
    });
    const category = categories.get(entry.categoryId);
    const groupKey = `${entry.categoryId}:${entry.groupId}`;
    if (!groups.has(groupKey)) {
      const group = {
        id: entry.groupId, label: entry.groupLabel, help: entry.groupHelp,
        categoryId: entry.categoryId, categoryLabel: entry.categoryLabel,
        sort: entry.groupSort, options: []
      };
      groups.set(groupKey, group);
      category.groups.push(group);
    }
    const group = groups.get(groupKey);
    const enriched = {
      ...entry,
      subcategory: entry.groupLabel,
      rank: parseBoostVariant(entry.name).rank,
      requirements: entry.automation === "midi" ? ["midi-qol", "dae"] : entry.requirements
    };
    group.options.push(enriched);
    entriesById.set(enriched.id, enriched);
  }
  catalogCategories = [...categories.values()].map((category) => ({
    ...category,
    groups: category.groups.sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label))
  }));
  catalogGroups = [...groups.values()].sort((a, b) => a.categoryId.localeCompare(b.categoryId) || a.sort - b.sort);
  catalogEntries = [...entriesById.values()];
  groupById = new Map(catalogGroups.map((group) => [group.id, group]));
  entryById = entriesById;
  return getBoostCatalog();
}

export function getBoostCatalog() {
  return { categories: catalogCategories, groups: catalogGroups, entries: catalogEntries, version: MODULE_VERSION, source: "compendium" };
}

export async function discoverBoostCatalog() {
  return getBoostCatalog();
}

const LEGACY_NAME_MAP = Object.freeze({
  "Quickness I": "initiative.pb", "Quickness II": "initiative.pb2", "Nimble I": "ac.1", "Nimble II": "ac.2",
  "Skilled I": "accuracy.weapon.1", "Skilled II": "accuracy.weapon.2", "Spellslinger II": "spell.attack.2", "Potent Spell Caster II": "spell.dc.2",
  "NPC Quarter Caster": "caster.quarter", "NPC Half Caster": "caster.half", "NPC Full Caster": "caster.full",
  "Parry": "reaction.parry", "Parry II": "reaction.greater-parry", "Second Wind": "recovery.second-wind", "Regeneration": "recovery.regeneration.pb2",
  "Nimble Dash": "movement.nimble-dash", "Fleet Footed": "movement.fleet-footed", "Cunning Action": "movement.cunning-action", "Skirmisher": "movement.skirmisher",
  "Flyby": "movement.flyby", "Wall Crawler": "movement.wall-crawler", "Arcane Blink": "movement.arcane-blink", "Void Step": "movement.void-step",
  "Master of Tactics": "leadership.master-tactics", "Tactical Guidance": "leadership.tactical-guidance", "Rally": "leadership.rally",
  "Command Ally": "leadership.command-ally", "Command I": "leadership.command-1", "Command II": "leadership.command-2"
});

export function parseBoostVariant(name) {
  const text = String(name ?? "").trim();
  const caster = { "NPC Quarter Caster": 1, "NPC Half Caster": 2, "NPC Full Caster": 3 }[text];
  if (caster) return { family: "Caster Progression", rank: caster, rankLabel: ["Quarter caster", "Half caster", "Full caster"][caster - 1], kind: "caster" };
  const match = text.match(/^(.*?)(?:\s+(I{1,3}|[1-3]))$/i);
  if (!match) return { family: text || "Unnamed Boost", rank: null, rankLabel: null, kind: "boost" };
  const ranks = { I: 1, II: 2, III: 3 };
  const rank = ranks[match[2].toUpperCase()] ?? Number(match[2]);
  return { family: match[1].trim() || text, rank, rankLabel: `Rank ${["", "I", "II", "III"][rank]}`, kind: "boost" };
}

function stringMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [String(key), String(entry ?? "").trim()]));
}

export function normalizeBoostConfig(input = {}) {
  const source = input.boosts ?? input ?? {};
  const selections = {};
  let legacyCount = Number(source.legacyCount) || 0;
  for (const [groupId, boostId] of Object.entries(stringMap(source.selections))) {
    const entry = entryById.get(boostId);
    if (entry?.groupId === groupId) selections[groupId] = boostId;
  }
  const legacySelections = new Set();
  for (const value of Array.isArray(source.selected) ? source.selected : []) {
    const id = String(value ?? "").trim();
    const entry = entryById.get(id);
    if (entry && !selections[entry.groupId]) selections[entry.groupId] = id;
    else if (id.startsWith("Compendium.")) legacySelections.add(id);
  }
  legacyCount += legacySelections.size;
  const rawNames = stringMap(source.names ?? source.customNames);
  const names = {};
  for (const [groupId, value] of Object.entries(rawNames)) if (groupById.has(groupId) && value) names[groupId] = value.slice(0, 80);
  const openCategories = [...new Set((Array.isArray(source.openCategories) ? source.openCategories : DEFAULT_OPEN_CATEGORIES)
    .map(String).filter((id) => catalogCategories.some((category) => category.id === id)))];
  return {
    selections,
    names,
    search: String(source.search ?? "").trim().slice(0, 80),
    selectedOnly: Boolean(source.selectedOnly),
    openCategories,
    legacyCount
  };
}

export function parseBoostForm(formData) {
  const selections = {};
  const names = {};
  for (const group of catalogGroups) {
    const selected = String(formData.get(`boosts.selection.${group.id}`) ?? "").trim();
    const name = String(formData.get(`boosts.name.${group.id}`) ?? "").trim();
    if (selected) selections[group.id] = selected;
    if (name) names[group.id] = name;
  }
  return normalizeBoostConfig({
    selections, names,
    search: formData.get("boosts.search") ?? "",
    selectedOnly: formData.has("boosts.selectedOnly"),
    openCategories: formData.getAll("boosts.openCategories")
  });
}

export function recommendBoosts({ role = "balanced", tier = "standard" } = {}) {
  const rank = { minion: 1, standard: 1, elite: 2, boss: 3 }[tier] ?? 1;
  const byRole = {
    balanced: [`initiative.flat.${rank}`, `saves.all.${rank}`],
    brute: [`saves.all.${rank}`, "recovery.second-wind"],
    soldier: [`ac.${rank}`, rank >= 3 ? "reaction.greater-parry" : "reaction.parry"],
    skirmisher: [rank >= 2 ? "initiative.pb" : "initiative.flat.1", `speed.${rank * 5}`, "movement.skirmisher"],
    sniper: [`initiative.flat.${rank}`, `accuracy.weapon.${rank}`, "movement.skirmisher"],
    controller: [`spell.dc.${Math.min(rank, 2)}`, "movement.arcane-blink", "leadership.tactical-guidance"],
    support: [`saves.all.${rank}`, "leadership.master-tactics"],
    caster: [`spell.attack.${rank}`, `spell.dc.${Math.min(rank, 2)}`, "caster.full", "movement.arcane-blink"],
    leader: ["initiative.pb", rank >= 3 ? "leadership.command-2" : rank >= 2 ? "leadership.command-ally" : "leadership.rally"]
  };
  return [...new Set((byRole[role] ?? byRole.balanced).filter((id) => entryById.has(id)))];
}

export function buildBoostCategories(config = {}, recommended = []) {
  const normalized = normalizeBoostConfig(config);
  const recommendedSet = new Set(recommended);
  return catalogCategories.map((category) => {
    const groups = category.groups.map((group) => {
      const selectedId = normalized.selections[group.id] ?? "";
      return {
        ...group, selectedId, customName: normalized.names[group.id] ?? "", hasSelection: Boolean(selectedId),
        options: group.options.map((option) => ({
          ...option,
          value: option.id,
          selected: option.id === selectedId,
          recommended: recommendedSet.has(option.id),
          powerLabel: POWER_LABELS[option.power] ?? option.power,
          automationLabel: AUTOMATION_LABELS[option.automation] ?? option.automation,
          actionLabel: option.activation?.type ? `${option.activation.type} timing` : "Passive",
          impactLabel: Object.keys(option.impact ?? {}).some((key) => ["ac", "weaponAttack", "spellAttack", "spellDc"].includes(key)) ? "FoF stat" : "Feature layer"
        }))
      };
    });
    const selectedCount = groups.filter((group) => group.hasSelection).length;
    return { ...category, groups, selectedCount, hasSelection: selectedCount > 0, open: normalized.openCategories.includes(category.id) || selectedCount > 0 };
  });
}

/** Compatibility wrapper for the pre-1.6 UI API. */
export function buildBoostGroups(_catalog, selected = []) {
  const config = normalizeBoostConfig({ selected });
  return { groups: buildBoostCategories(config).flatMap((category) => category.groups), blocked: [] };
}

function itemFlag(item, key) {
  try {
    const value = item?.getFlag?.(MODULE_ID, key);
    if (value !== undefined) return value;
  } catch (_error) {
    // Stored data remains readable when a prior module scope is inactive.
  }
  return item?.flags?.[MODULE_ID]?.[key] ?? item?._source?.flags?.[MODULE_ID]?.[key];
}

export function restoreBoostConfig(actor, fallback = {}) {
  const normalized = normalizeBoostConfig(fallback);
  const generated = collectionValues(actor?.items).filter((item) => itemFlag(item, "generated") && itemFlag(item, "kind") === "boost");
  if (!generated.length) return normalized;
  const selections = {};
  const names = {};
  let legacyCount = 0;
  for (const item of generated) {
    const id = itemFlag(item, "boostId") ?? LEGACY_NAME_MAP[item?.name];
    const entry = entryById.get(id);
    if (!entry) {
      legacyCount += 1;
      continue;
    }
    selections[entry.groupId] = id;
    delete names[entry.groupId];
    const customName = String(itemFlag(item, "customName") ?? "").trim();
    if (customName) names[entry.groupId] = customName.slice(0, 80);
    else if (item?.name && item.name !== entry.name && !LEGACY_NAME_MAP[item.name]) names[entry.groupId] = String(item.name).slice(0, 80);
  }
  return normalizeBoostConfig({ ...normalized, selections: Object.keys(selections).length ? selections : normalized.selections, names: Object.keys(selections).length ? names : normalized.names, legacyCount: normalized.legacyCount + legacyCount });
}

export function selectBoosts(config = {}, { actor = null } = {}) {
  const normalized = normalizeBoostConfig(config);
  const selected = [];
  const warnings = [];
  if (normalized.legacyCount) warnings.push(`${normalized.legacyCount} saved compendium boost selection(s) could not be migrated automatically. Choose a replacement from the currently linked boost library.`);
  for (const group of catalogGroups) {
    const id = normalized.selections[group.id];
    if (!id) continue;
    const entry = entryById.get(id);
    if (!entry || entry.groupId !== group.id) continue;
    const customName = normalized.names[group.id] ?? "";
    selected.push({
      ...entry,
      customName,
      displayName: customName || entry.name,
      powerLabel: POWER_LABELS[entry.power] ?? entry.power,
      automationLabel: AUTOMATION_LABELS[entry.automation] ?? entry.automation,
      actionLabel: entry.activation?.type ? `${entry.activation.type} timing` : "Passive",
      impactLabel: Object.keys(entry.impact ?? {}).some((key) => ["ac", "weaponAttack", "spellAttack", "spellDc"].includes(key)) ? "FoF stat" : "Feature layer"
    });
  }
  const selectedNames = new Set(selected.flatMap((entry) => [entry.name, entry.displayName]).map((name) => name.toLowerCase()));
  const possibleDuplicates = collectionValues(actor?.items)
    .filter((item) => !itemFlag(item, "generated") && selectedNames.has(String(item?.name ?? "").toLowerCase()))
    .map((item) => item.name);
  if (possibleDuplicates.length) warnings.push(`Possible equivalent actor feature${possibleDuplicates.length === 1 ? "" : "s"} already present: ${[...new Set(possibleDuplicates)].join(", ")}.`);
  const major = selected.filter((entry) => entry.power === "major");
  if (major.length >= 2) warnings.push(`${major.length} major-power boosts are selected (${major.map((entry) => entry.displayName).join(", ")}). Review their combined durability and action-economy impact.`);
  const needsMidi = selected.some((entry) => entry.automation === "midi");
  const midiReady = Boolean(globalThis.game?.modules?.get?.("midi-qol")?.active && globalThis.game?.modules?.get?.("dae")?.active);
  if (needsMidi && !midiReady) warnings.push("A selected boost has optional Midi-QOL/DAE support. Its rule text remains usable, but conditional advantage must be resolved manually while either module is inactive.");
  return { config: normalized, selected, warnings };
}

function resolvedImpact(entry, proficiency) {
  const impact = { ...(entry.impact ?? {}) };
  if (impact.initiativeProf) impact.initiative = impact.initiativeProf * proficiency;
  return impact;
}

export function calculateBoostImpact(selected = [], { actorProfile = {}, foundation = null, plan = null } = {}) {
  const proficiency = Number(foundation?.proficiency ?? actorProfile.proficiency) || 2;
  const total = { initiative: 0, speed: 0, ac: 0, saves: 0, weaponAttack: 0, spellAttack: 0, spellDc: 0, notes: [], actions: [], recovery: [] };
  for (const entry of selected) {
    const impact = resolvedImpact(entry, proficiency);
    for (const key of ["initiative", "speed", "ac", "saves", "weaponAttack", "spellAttack", "spellDc"]) total[key] += Number(impact[key]) || 0;
    if (impact.note) total.notes.push(impact.note);
    if (impact.action) total.actions.push(impact.action);
    if (impact.recovery) total.recovery.push(impact.recovery);
  }
  const sections = plan?.config?.sections ?? {};
  const foundationApplied = sections.foundation !== false && foundation?.config?.mode === "apply";
  const baseAc = foundationApplied && foundation.config.manage.ac ? foundation.final.ac : Number(actorProfile.ac) || 0;
  const baseSpeed = foundationApplied && foundation.config.manage.body && foundation.body.speed !== null ? foundation.body.speed : Number(actorProfile.speed) || 0;
  const baseAttack = Number(plan?.primary?.attackBonus ?? plan?.suggestedAttackBonus ?? foundation?.final?.attackBonus) || 0;
  const baseSpellAttack = Number(foundation?.casting?.attackBonus) || 0;
  const baseDc = Number(foundation?.final?.saveDc ?? actorProfile.spellDc) || 0;
  const rows = [];
  if (total.initiative) rows.push({ key: "Initiative", before: "Current", after: `${total.initiative >= 0 ? "+" : ""}${total.initiative} bonus` });
  if (total.speed) rows.push({ key: "Speed", before: `${baseSpeed} ft`, after: `${baseSpeed + total.speed} ft` });
  if (total.ac) rows.push({ key: "Armor class", before: baseAc || "—", after: baseAc ? baseAc + total.ac : `+${total.ac}` });
  if (total.saves) rows.push({ key: "All saves", before: "Current", after: `+${total.saves} bonus` });
  if (total.weaponAttack) rows.push({ key: "Weapon attacks", before: `${baseAttack >= 0 ? "+" : ""}${baseAttack}`, after: `${baseAttack + total.weaponAttack >= 0 ? "+" : ""}${baseAttack + total.weaponAttack}` });
  if (total.spellAttack) rows.push({ key: "Spell attacks", before: baseSpellAttack ? `+${baseSpellAttack}` : "Current", after: baseSpellAttack ? `+${baseSpellAttack + total.spellAttack}` : `+${total.spellAttack} additional` });
  if (total.spellDc) rows.push({ key: "Spell save DC", before: baseDc ? `DC ${baseDc}` : "Current", after: baseDc ? `DC ${baseDc + total.spellDc}` : `+${total.spellDc} additional` });
  if (total.recovery.length) rows.push({ key: "Recovery", before: "None from boosts", after: total.recovery.join("; ") });
  if (total.actions.length) rows.push({ key: "Action economy", before: "Base", after: total.actions.join("; ") });
  if (total.notes.length) rows.push({ key: "Other", before: "—", after: total.notes.join("; ") });
  return { ...total, rows };
}

function activityActivation(entry) {
  const type = entry.activation?.type ?? "special";
  return { type, value: ["action", "bonus", "reaction"].includes(type) ? 1 : null, condition: entry.activation?.condition ?? "", override: true };
}

function buildActivity(entry, idFactory) {
  if (!entry.activation && !entry.healing) return null;
  const id = idFactory();
  const target = entry.target ?? {};
  const healing = entry.healing ?? {};
  const common = {
    _id: id, type: entry.healing ? "heal" : "utility", name: entry.displayName ?? entry.name, sort: 0,
    activation: activityActivation(entry),
    consumption: { targets: entry.uses?.max ? [{ type: "itemUses", value: "1", target: "" }] : [], scaling: { allowed: false }, spellSlot: false },
    description: { value: "", chatFlavor: "" },
    range: {
      units: target.rangeUnits ?? (healing.range ? "ft" : "self"),
      value: target.range ?? (healing.range ? String(healing.range) : null), override: true
    },
    target: {
      template: { contiguous: false, units: "ft", type: "", size: "", width: "", height: "", distance: "", direction: "", angle: "", stationary: false },
      affects: { choice: false, type: target.type ?? healing.target ?? "self", count: target.count ?? (healing.target ? "1" : "") },
      override: true, prompt: true
    }
  };
  if (!entry.healing) return { id, data: common };
  const customFormula = entry.healing.formula ?? "";
  common.healing = {
    number: entry.healing.number ?? null, denomination: entry.healing.denomination ?? 0, bonus: entry.healing.bonus ?? "",
    types: [entry.healing.type ?? "healing"], custom: { enabled: Boolean(customFormula), formula: customFormula }, scaling: { number: 1 }, modifiers: []
  };
  return { id, data: common };
}

function buildEffect(entry, idFactory) {
  if (!entry.effect?.length) return null;
  const modern = entry.effect.map((change) => ({
    _id: idFactory(), key: change.key, value: String(change.value), priority: change.priority ?? 20,
    type: change.key.startsWith("flags.midi-qol.") ? "custom" : (change.mode ?? "add"), phase: "initial", conditions: "{}", replacement: ""
  }));
  const legacy = entry.effect.map((change) => ({ key: change.key, value: String(change.value), mode: change.key.startsWith("flags.midi-qol.") ? 0 : change.mode === "upgrade" ? 4 : 2, priority: change.priority ?? 20 }));
  const data = {
    _id: idFactory(), name: entry.displayName ?? entry.name, img: entry.img ?? "icons/svg/aura.svg", type: "base", transfer: true, disabled: false,
    duration: {}, statuses: [], flags: { dae: { stackable: "noneName", showIcon: false, specialDuration: [] } }
  };
  const systemMajor = Number.parseInt(String(globalThis.game?.system?.version ?? "6").split(".")[0], 10);
  if (systemMajor >= 6) data.system = { changes: modern, conditions: "{}", magical: false, rider: { statuses: [] } };
  else data.changes = legacy;
  return data;
}

function itemUses(entry) {
  if (!entry.uses?.max) return { max: "", spent: 0, recovery: [] };
  if (Array.isArray(entry.uses.recovery)) return { max: String(entry.uses.max), spent: 0, recovery: structuredClone(entry.uses.recovery) };
  const recovery = { period: entry.uses.period ?? "day", type: "recoverAll" };
  if (entry.uses.formula) recovery.formula = entry.uses.formula;
  return { max: String(entry.uses.max), spent: 0, recovery: [recovery] };
}

export function prepareBoostItemData(entry, { setId, idFactory = () => crypto.randomUUID().replaceAll("-", "").slice(0, 16), plan = null } = {}) {
  if (!entry?.id || !entryById.has(entry.id)) throw new Error("The selected compendium boost is unavailable in the linked library.");
  const name = String(entry.displayName || entry.customName || entry.name).trim().slice(0, 80) || entry.name;
  const activity = buildActivity(entry, idFactory);
  const effect = buildEffect(entry, idFactory);
  return {
    name, type: "feat", img: entry.img ?? "icons/svg/aura.svg",
    flags: {
      [MODULE_ID]: {
        generated: true, version: MODULE_VERSION, setId, kind: "boost", role: "boost",
        boostId: entry.id, boostGroup: entry.groupId, category: entry.categoryId, defaultName: entry.name,
        customName: entry.customName || "", power: entry.power, automation: entry.automation,
        exclusiveGroup: entry.exclusiveGroup, requirements: entry.requirements
      },
      dae: { stackable: "noneName" }
    },
    effects: effect ? [effect] : [],
    system: {
      description: {
        value: `<p>${escapeHtml(entry.description)}</p>`,
        chat: "", unidentified: ""
      },
      type: { value: "monster", subtype: "" }, identifier: entry.id.replaceAll(".", "-"), uses: itemUses(entry),
      activities: activity ? { [activity.id]: activity.data } : {}
    }
  };
}

/** Boost definitions are resolved from the scanned compendium catalog. */
export async function resolveBoostSources(entries = []) {
  return entries;
}
