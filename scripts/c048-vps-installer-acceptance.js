#!/usr/bin/env node

import { lstat, realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createProductInstallerAcceptanceService, createProtectedStateSnapshot } from "../framework/src/index.js";

const workspace = path.resolve(new URL("..", import.meta.url).pathname);
const runtimeConfig = path.join(workspace, "config", "c048-installer-runtime.mjs");

if (!process.argv.includes("--confirm") || process.getuid?.() !== 0) throw new Error(`Run with: sudo ${path.join(workspace, "runtime/node/bin/node")} ${path.join(workspace, "scripts/c048-vps-installer-acceptance.js")} --confirm`);
await assertContained(runtimeConfig, workspace);
const factory = (await import(pathToFileURL(runtimeConfig).href)).default;
if (typeof factory !== "function") throw new TypeError("config/c048-installer-runtime.mjs must export a default composition factory.");
const runtime = await factory({ workspace });
const acceptance = createProductInstallerAcceptanceService({
  health: runtime.health,
  installer: runtime.installer,
  maintenance: runtime.maintenance,
  probes: runtime.probes,
  requireRealProbes: true,
  snapshot: createProtectedStateSnapshot({ databaseFingerprint: runtime.databaseFingerprint, workspace }),
  workspace
});
if (typeof runtime.databaseFingerprint !== "function") throw new TypeError("C048 VPS composition must provide a deterministic real databaseFingerprint function.");
const result = await acceptance.run({ ...runtime.input, confirmed: true, nodeVersion: process.version, workspace });
console.log(JSON.stringify(result.evidence, null, 2));

async function assertContained(file, root) {
  await lstat(file);
  const canonicalRoot = await realpath(root);
  const canonicalFile = await realpath(file);
  if (canonicalFile !== path.join(canonicalRoot, "config", "c048-installer-runtime.mjs")) throw new Error("C048 composition module must be the Installation-owned config/c048-installer-runtime.mjs file.");
}
