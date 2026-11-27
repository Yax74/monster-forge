import { MODULE_ID, MODULE_TITLE } from "./constants.js";
import { getGeneratedItems, removeGeneratedItems, resolveTargetActor, undoLastOperation } from "./actor-service.js";
import { createNpcFromScratch, openForge, refreshCompendiumLibrary } from "./app.js";
import { getBoostCatalog } from "./boosts.js";

function actorFromSheet(app) {
  const document = app?.document ?? app?.actor;
  return document?.documentName === "Actor" ? document : null;
}

function canForge(actor) {
  return actor?.type === "npc" && actor.isOwner;
}

function addV2HeaderControl(app, controls) {
  const actor = actorFromSheet(app);
  if (!canForge(actor) || controls.some((control) => control.action === MODULE_ID)) return;
  controls.push({
    action: MODULE_ID,
    label: MODULE_TITLE,
    icon: "fa-solid fa-hammer",
    ownership: "OWNER",
    onClick: () => openForge(actor)
  });
}

function addV1HeaderButton(app, buttons) {
  const actor = actorFromSheet(app);
  if (!canForge(actor) || buttons.some((button) => button.class === MODULE_ID)) return;
  buttons.unshift({
    class: MODULE_ID,
    label: MODULE_TITLE,
    icon: "fas fa-hammer",
    onclick: () => openForge(actor)
  });
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "defaults", {
    name: "Monster Forge defaults",
    hint: "Client-specific values most recently used in the Monster Forge dialog.",
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register(MODULE_ID, "profiles", {
    name: "Monster Forge build profiles",
    hint: "Client-specific named build profiles.",
    scope: "client",
    config: false,
    type: Object,
    default: []
  });

  game.settings.register(MODULE_ID, "quickMode", {
    name: "Monster Forge quick build mode",
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, "contentPacks", {
    name: "Monster Forge NPC content compendiums",
    hint: "Configured by the GM Setup tab. Linked Item compendiums can provide NPC actions, traits, species traits, boosts, and species profiles.",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  game.settings.register(MODULE_ID, "defaultSpeciesTraits", {
    name: "Add species traits to new NPCs by default",
    hint: "New NPCs begin with this preference; it can still be changed for each creature.",
    scope: "world",
    config: false,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "foundationDefaultsV19", {
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, "foundationDefaultsV20", {
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });

  game.keybindings.register(MODULE_ID, "open", {
    name: "Open Monster Forge",
    hint: "Open Monster Forge for the selected NPC, or create a creature if none is selected.",
    editable: [{ key: "KeyM", modifiers: ["ALT"] }],
    restricted: true,
    onDown: () => {
      openForge();
      return true;
    }
  });
});

Hooks.once("ready", async () => {
  try {
    await refreshCompendiumLibrary();
  } catch (error) {
    console.error(`${MODULE_ID} | Unable to load the configured Item compendiums.`, error);
  }

  game.monsterForge = Object.freeze({
    open: openForge,
    createNpc: createNpcFromScratch,
    undo: async (actor = null) => undoLastOperation(actor ?? resolveTargetActor()),
    removeGenerated: async (actor = null) => removeGeneratedItems(actor ?? resolveTargetActor()),
    getGenerated: (actor = null) => getGeneratedItems(actor ?? resolveTargetActor()),
    getFoundation: (actor = null) => (actor ?? resolveTargetActor()).getFlag(MODULE_ID, "foundation") ?? null,
    getBoostCatalog,
    refreshLibrary: refreshCompendiumLibrary
  });

  if (game.system.version && !/^5\.|^6\./.test(game.system.version)) {
    ui.notifications.warn(`Monster Forge was built for D&D5e 5.x–6.x; detected ${game.system.version}.`);
  }
});

Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user.isGM || !controls.tokens?.tools) return;
  if (!controls.tokens.tools[MODULE_ID]) controls.tokens.tools[MODULE_ID] = {
    name: MODULE_ID,
    title: MODULE_TITLE,
    icon: "fa-solid fa-hammer",
    order: Object.keys(controls.tokens.tools).length,
    button: true,
    visible: true,
    onChange: () => openForge()
  };
});

Hooks.on("getHeaderControlsApplicationV2", addV2HeaderControl);
Hooks.on("getApplicationV1HeaderButtons", addV1HeaderButton);
