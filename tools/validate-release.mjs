import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { MODULE_VERSION } from "../scripts/constants.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(root, "module.json"), "utf8"));
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const [tag = `v${manifest.version}`, repository = "Yax74/monster-forge"] = process.argv.slice(2);
const failures = [];

if (manifest.id !== "monster-forge") failures.push("module.json id must be monster-forge.");
if (packageJson.version !== manifest.version) failures.push("package.json and module.json versions differ.");
if (MODULE_VERSION !== manifest.version) failures.push("scripts/constants.js and module.json versions differ.");
if (tag !== `v${manifest.version}`) failures.push(`Tag ${tag} must equal v${manifest.version}.`);

const baseUrl = `https://github.com/${repository}`;
const expected = {
  url: baseUrl,
  manifest: `${baseUrl}/releases/latest/download/module.json`,
  download: `${baseUrl}/releases/download/v${manifest.version}/monster-forge.zip`
};
for (const [field, value] of Object.entries(expected)) {
  if (manifest[field] !== value) failures.push(`module.json ${field} must be ${value}.`);
}

if (Number(manifest.compatibility?.minimum) > 13) failures.push("Foundry minimum compatibility must include V13.");
const dnd5e = manifest.relationships?.systems?.find((system) => system.id === "dnd5e");
if (!dnd5e) failures.push("module.json must declare its D&D5e system relationship.");
for (const moduleId of ["midi-qol", "dae"]) {
  const recommended = manifest.relationships?.recommends?.some((module) => module.id === moduleId);
  if (!recommended) failures.push(`module.json must recommend the optional ${moduleId} integration.`);
}

for (const relativePath of [...(manifest.esmodules ?? []), ...(manifest.styles ?? [])]) {
  try {
    await access(path.join(root, relativePath));
  } catch {
    failures.push(`Manifest entry does not exist: ${relativePath}`);
  }
}

for (const required of ["README.md", "CHANGELOG.md", "LICENSE", "templates/forge-dialog.hbs"]) {
  try {
    await access(path.join(root, required));
  } catch {
    failures.push(`Required release file is missing: ${required}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Release metadata is valid for ${repository} ${tag}.`);
