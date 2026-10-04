import { MODULE_ID, MODULE_TITLE } from "./constants.js";
import { getGeneratedItems, removeGeneratedItems, resolveTargetActor, undoLastOperation } from "./actor-service.js";
import { openForge } from "./app.js";

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

  game.keybindings.register(MODULE_ID, "open", {
    name: "Open Monster Forge",
    hint: "Open Monster Forge for the selected NPC token.",
    editable: [{ key: "KeyM", modifiers: ["ALT"] }],
    restricted: true,
    onDown: () => {
      openForge();
      return true;
    }
  });
});

Hooks.once("ready", () => {
  game.monsterForge = Object.freeze({
    open: openForge,
    undo: async (actor = null) => undoLastOperation(actor ?? resolveTargetActor()),
    removeGenerated: async (actor = null) => removeGeneratedItems(actor ?? resolveTargetActor()),
    getGenerated: (actor = null) => getGeneratedItems(actor ?? resolveTargetActor())
  });

  if (game.system.version && !/^5\.|^6\./.test(game.system.version)) {
    ui.notifications.warn(`Monster Forge was built for D&D5e 5.x–6.x; detected ${game.system.version}.`);
  }
});

Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user.isGM || !controls.tokens?.tools || controls.tokens.tools[MODULE_ID]) return;
  controls.tokens.tools[MODULE_ID] = {
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
