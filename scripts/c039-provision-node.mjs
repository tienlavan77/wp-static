#!/usr/bin/env node

import path from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { createNodeDistributionService } from "../framework/src/index.js";
import { createTrustedNodeMetadataAdapter, downloadNodeArchive, extractTarXzArchive, inspectTarXzArchive } from "../framework/src/product/installer/createNodeDistributionProductionAdapters.js";

const workspace = required("--workspace");
const installationId = value("--installation", "production");
const majors = value("--majors", "20,22,26").split(",").map(Number);
if (!process.argv.includes("--confirm")) throw new Error("C039 Node provisioning requires --confirm.");
if (process.getuid?.() !== 0) throw new Error("C039 Node provisioning must run as root so the installed runtime ownership is deterministic.");
const fetchMetadata = createTrustedNodeMetadataAdapter({ majors });
const execFile = promisify(execFileCallback);
const service = createNodeDistributionService({
  allowedHosts: ["nodejs.org"],
  fetchMetadata,
  download: downloadNodeArchive,
  inspectArchive: inspectTarXzArchive,
  extract: extractTarXzArchive,
  inspectVersion: async (target) => (await execFile(path.join(target, "bin", "node"), ["--version"], { encoding: "utf8" })).stdout.trim(),
  matrix: { majors }
});
const result = await service.install({ installationId, target: path.join(path.resolve(workspace), "runtime", "node"), selected: undefined });
console.log(JSON.stringify({ installationId, target: path.join(path.resolve(workspace), "runtime", "node"), version: result.version, changed: result.changed, preserved: result.preserved }, null, 2));

function value(name, fallback) { const index = process.argv.indexOf(name); return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback; }
function required(name) { const result = value(name); if (!result || !path.isAbsolute(result)) throw new Error(`Usage: c039-provision-node.mjs ${name} <absolute-workspace> [--installation <id>] [--majors 20,22,26] --confirm`); return result; }
