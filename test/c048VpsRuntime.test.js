import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createC048VpsRuntime from "../framework/src/product/installer/createC048VpsRuntime.js";
import { isRealVpsAcceptanceProbe } from "../framework/src/product/installer/createRealVpsAcceptanceProbes.js";

const execFile = promisify(execFileCallback);

test("C048 first-party VPS composition constructs C039-C047 owners from deployment-only input", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "wpsc-c048-runtime-"));
  await mkdir(path.join(workspace, "config"), { recursive: true });
  await writeFile(path.join(workspace, "config", "core-update-public.pem"), "test-public-key");
  const digest = "d".repeat(64);
  const runtime = await createC048VpsRuntime({
    database: { fingerprintCommand: ["/usr/bin/database-fingerprint", "--sha256"] },
    domain: "shop.example.com",
    execFile: async (command) => command === "/usr/bin/database-fingerprint" ? { stdout: `${digest}\n` } : { stdout: "" },
    fetch: async () => ({ arrayBuffer: async () => new ArrayBuffer(0), ok: true, status: 200, url: "https://releases.example.com/package.json" }),
    installationId: "production",
    node: { sha256: "a".repeat(64), size: 1, url: "https://nodejs.org/dist/v20.19.5/node.tar.xz", version: "20.19.5" },
    package: { sha256: "b".repeat(64), size: 100, url: "https://releases.example.com/wpsc/1.0.0.json", version: "1.0.0" },
    registryPath: path.join(workspace, "registry.json"),
    workspace
  });
  assert.equal(typeof runtime.installer.install, "function");
  assert.equal(typeof runtime.maintenance.run, "function");
  assert.equal(typeof runtime.health.inspect, "function");
  assert.equal(await runtime.databaseFingerprint(), digest);
  assert.equal(runtime.input.installationId, "production");
  assert.equal(runtime.input.installation.acquisition.version, "1.0.0");
  for (const probe of Object.values(runtime.probes)) assert.equal(isRealVpsAcceptanceProbe(probe), true);
});

test("C048 first-party VPS composition rejects incomplete package and database configuration", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "wpsc-c048-runtime-invalid-"));
  await mkdir(path.join(workspace, "config"), { recursive: true });
  await writeFile(path.join(workspace, "config", "core-update-public.pem"), "test-public-key");
  const common = { domain: "shop.example.com", installationId: "production", node: { url: "https://nodejs.org/node.tar.xz", version: "20.19.5" }, package: { sha256: "b".repeat(64), size: 100, url: "https://releases.example.com/package.json", version: "1.0.0" }, registryPath: path.join(workspace, "registry.json"), workspace };
  await assert.rejects(createC048VpsRuntime({ ...common, database: {} }), /fingerprintCommand/);
  await assert.rejects(createC048VpsRuntime({ ...common, database: { fingerprintCommand: ["relative-command"] } }), /absolute executable/);
  await assert.rejects(createC048VpsRuntime({ ...common, database: { fingerprintCommand: ["/bin/true"] }, package: { ...common.package, sha256: "bad" } }), /package metadata is invalid/);
});

test("C048 database helper fingerprints real file content and distinguishes missing state", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c048-database-"));
  const database = path.join(root, "data.db");
  const script = path.resolve("scripts/c048-database-fingerprint.js");
  const missing = (await execFile(process.execPath, [script, "--path", database])).stdout.trim();
  await writeFile(database, "database-v1");
  const first = (await execFile(process.execPath, [script, "--path", database])).stdout.trim();
  await writeFile(database, "database-v2");
  const second = (await execFile(process.execPath, [script, "--path", database])).stdout.trim();
  for (const value of [missing, first, second]) assert.match(value, /^[a-f0-9]{64}$/);
  assert.notEqual(missing, first);
  assert.notEqual(first, second);
});
