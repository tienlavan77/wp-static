#!/usr/bin/env node

import { access, lstat, realpath } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createProductInstallerAcceptanceService, createProtectedStateSnapshot } from "../framework/src/index.js";

const harnessWorkspace = path.resolve(new URL("..", import.meta.url).pathname);

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main(process.argv.slice(2));

export async function main(args = []) {
  const input = parseRunnerInput(args, harnessWorkspace);
  if (process.getuid?.() !== 0) throw new Error(`Run with: sudo ${path.join(harnessWorkspace, "runtime/node/bin/node")} ${path.join(harnessWorkspace, "scripts/c048-vps-installer-acceptance.js")} --workspace <fresh-installation-root> --confirm`);
  const workspace = await resolveTargetWorkspace(input.workspace);
  await assertProvisionedNode(workspace);
  const runtimeConfig = path.join(workspace, "config", "c048-installer-runtime.mjs");
  await assertContained(runtimeConfig, workspace);
  const factory = (await import(pathToFileURL(runtimeConfig).href)).default;
  if (typeof factory !== "function") throw new TypeError("config/c048-installer-runtime.mjs must export a default composition factory.");
  const runtime = await factory({ harnessWorkspace, workspace });
  if (typeof runtime.databaseFingerprint !== "function") throw new TypeError("C048 VPS composition must provide a deterministic real databaseFingerprint function.");
  const acceptance = createProductInstallerAcceptanceService({
    health: runtime.health,
    installer: runtime.installer,
    maintenance: runtime.maintenance,
    probes: runtime.probes,
    requireRealProbes: true,
    snapshot: createProtectedStateSnapshot({ databaseFingerprint: runtime.databaseFingerprint, workspace }),
    workspace
  });
  const result = await acceptance.run({ ...runtime.input, confirmed: true, nodeVersion: process.version, workspace });
  console.log(JSON.stringify(result.evidence, null, 2));
  return result;
}

export function parseRunnerInput(args = [], sourceWorkspace = harnessWorkspace) {
  if (!args.includes("--confirm")) throw new Error("C048 real VPS acceptance requires --confirm.");
  const positions = args.reduce((all, value, index) => value === "--workspace" ? [...all, index] : all, []);
  if (positions.length !== 1 || args.length !== 3 || !args[positions[0] + 1]) throw new Error("C048 requires exactly: --workspace <fresh-installation-root> --confirm.");
  const workspace = String(args[positions[0] + 1]);
  if (!path.isAbsolute(workspace) || path.resolve(workspace) === path.resolve(sourceWorkspace)) throw new Error("C048 target workspace must be an explicit absolute path distinct from the harness workspace.");
  return Object.freeze({ workspace: path.resolve(workspace) });
}

async function resolveTargetWorkspace(workspace) {
  const metadata = await lstat(workspace);
  if (!metadata.isDirectory()) throw new TypeError("C048 target workspace must be an existing directory.");
  return realpath(workspace);
}

export async function assertProvisionedNode(workspace) {
  const nodePath = path.join(workspace, "runtime", "node", "bin", "node");
  try {
    await access(nodePath, fsConstants.X_OK);
  } catch (error) {
    throw new Error(`C048 requires a C039-provisioned executable Node at ${nodePath}. Complete Node provisioning before initial acceptance.`);
  }
  return nodePath;
}

async function assertContained(file, root) {
  await lstat(file);
  const canonicalRoot = await realpath(root);
  const canonicalFile = await realpath(file);
  if (canonicalFile !== path.join(canonicalRoot, "config", "c048-installer-runtime.mjs")) throw new Error("C048 composition module must be the Installation-owned config/c048-installer-runtime.mjs file.");
}
