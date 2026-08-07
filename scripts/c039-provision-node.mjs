#!/usr/bin/env node

import path from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { access, lstat, realpath } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { createHash } from "node:crypto";
import { createNodeDistributionService } from "../framework/src/index.js";
import createAtomicJsonStore from "../framework/src/product/installer/createAtomicJsonStore.js";
import { createTrustedNodeMetadataAdapter, downloadNodeArchive, extractTarXzArchive, inspectTarXzArchive } from "../framework/src/product/installer/createNodeDistributionProductionAdapters.js";

const workspace = required("--workspace");
const installationId = value("--installation", "production");
const majors = value("--majors", "20,22,26").split(",").map(Number);
if (!process.argv.includes("--confirm")) throw new Error("C039 Node provisioning requires --confirm.");
if (process.getuid?.() !== 0) throw new Error("C039 Node provisioning must run as root so the installed runtime ownership is deterministic.");
const fetchMetadata = createTrustedNodeMetadataAdapter({ majors });
const execFile = promisify(execFileCallback);
const installationRoot = path.resolve(workspace);
const runtimePath = path.join(installationRoot, "runtime", "node");
const nodeBinary = path.join(runtimePath, "bin", "node");
const evidenceStore = createAtomicJsonStore(path.join(installationRoot, "storage", "installer", "c039-node-provision-evidence.json"));
const before = await protectedSnapshot(installationRoot);
const service = createNodeDistributionService({
  allowedHosts: ["nodejs.org"],
  fetchMetadata,
  download: downloadNodeArchive,
  inspectArchive: inspectTarXzArchive,
  extract: extractTarXzArchive,
  inspectVersion: async (target) => (await execFile(path.join(target, "bin", "node"), ["--version"], { encoding: "utf8" })).stdout.trim(),
  matrix: { majors }
});
const result = await service.install({ installationId, target: runtimePath, selected: undefined });
const firstRuntime = await inspectRuntime(installationRoot, result.version);
const rerun = await service.install({ installationId, target: runtimePath, selected: undefined });
const secondRuntime = await inspectRuntime(installationRoot, result.version);
const after = await protectedSnapshot(installationRoot);
const protectedStateUnchanged = JSON.stringify(before) === JSON.stringify(after);
const evidence = {
  schema: "wpsc.c039-node-provision",
  schemaVersion: 1,
  installationId,
  workspace: installationRoot,
  platform: `${process.platform}-${process.arch}`,
  selectedVersion: result.version,
  runtimePath,
  nodeBinary,
  nodeExecutable: firstRuntime.executable,
  runtimeVersion: firstRuntime.version,
  versionMatch: firstRuntime.version.replace(/^v/, "") === result.version,
  runtimeContained: firstRuntime.contained,
  protectedStateUnchanged,
  idempotentRerun: rerun.preserved === true && JSON.stringify(firstRuntime) === JSON.stringify(secondRuntime),
  changed: result.changed,
  preservedOnRerun: rerun.preserved === true,
  status: protectedStateUnchanged && firstRuntime.executable && firstRuntime.contained && firstRuntime.version.replace(/^v/, "") === result.version && rerun.preserved === true ? "PASS" : "FAILED"
};
await evidenceStore.write(evidence);
if (evidence.status !== "PASS") throw new Error(`C039 Node provisioning evidence failed: ${JSON.stringify(evidence)}`);
console.log(JSON.stringify(evidence, null, 2));

function value(name, fallback) { const index = process.argv.indexOf(name); return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback; }
function required(name) { const result = value(name); if (!result || !path.isAbsolute(result)) throw new Error(`Usage: c039-provision-node.mjs ${name} <absolute-workspace> [--installation <id>] [--majors 20,22,26] --confirm`); return result; }

async function inspectRuntime(root, expectedVersion) {
  await access(nodeBinary, fsConstants.X_OK);
  const binaryStat = await lstat(nodeBinary);
  if (!binaryStat.isFile()) throw new Error("C039 Node binary is not a regular file.");
  const canonicalRoot = await realpath(root);
  const canonicalRuntime = await realpath(runtimePath);
  const canonicalBinary = await realpath(nodeBinary);
  const contained = canonicalRuntime === path.join(canonicalRoot, "runtime", "node") && canonicalBinary.startsWith(`${canonicalRuntime}${path.sep}`);
  if (!contained) { const error = new Error("C039 Node runtime is outside the Installation workspace."); error.code = "installation.node.path_outside_workspace"; throw error; }
  const version = (await execFile(nodeBinary, ["--version"], { encoding: "utf8" })).stdout.trim();
  if (version.replace(/^v/, "") !== expectedVersion) throw new Error(`C039 Node version ${version} does not match ${expectedVersion}.`);
  return { contained, executable: true, version };
}

async function protectedSnapshot(root) {
  const groups = {
    siteConfiguration: ["config", "sites"],
    credentials: ["config/runtime.env", "sites"],
    publicOutput: ["public"],
    database: ["storage/data.db"],
    core: ["core/active"]
  };
  const result = {};
  for (const [name, paths] of Object.entries(groups)) {
    const hash = createHash("sha256");
    for (const relative of [...paths].sort()) { hash.update(relative); hash.update(await fingerprint(path.join(root, relative), name)); }
    result[name] = hash.digest("hex");
  }
  return result;
}

async function fingerprint(target, group) {
  try {
    const metadata = await lstat(target);
    if (metadata.isSymbolicLink()) return `symlink:${target}`;
    if (metadata.isFile()) return `file:${metadata.size}:${createHash("sha256").update(await (await import("node:fs/promises")).readFile(target)).digest("hex")}`;
    if (metadata.isDirectory()) {
      const entries = [];
      for (const name of (await (await import("node:fs/promises")).readdir(target)).sort()) {
        if (group === "credentials" && !/credential|runtime\.env/i.test(name) && target.endsWith("config/runtime.env") === false) continue;
        entries.push([name, await fingerprint(path.join(target, name), group)]);
      }
      return `directory:${createHash("sha256").update(JSON.stringify(entries)).digest("hex")}`;
    }
    return `special:${metadata.mode}`;
  } catch (error) { if (error.code === "ENOENT") return "absent"; throw error; }
}
