import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { createSystemdRuntimeInstaller } from "../framework/src/index.js";

const execute = promisify(execFile);

test("C044 renders an Installation-specific www-data unit with absolute Node and core/active", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c044-render-"));
  const workspace = path.join(root, "workspace with spaces");
  const unit = await createSystemdRuntimeInstaller({ unitDirectory: path.join(root, "systemd") }).render({ installationId: "production", workspace });
  assert.equal(unit.unitName, "wpsc-runtime-production.service");
  assert.match(unit.content, /User=www-data/);
  assert.match(unit.content, /Group=www-data/);
  assert.ok(unit.content.includes(`"${workspace}/runtime/node/bin/node"`));
  assert.ok(unit.content.includes(`"${workspace}/core/active/framework/src/cli/index.js"`));
  assert.ok(unit.content.includes(`"--project" "${workspace}"`));
});

test("C044 installs, starts and proves the running process uses Installation Node and active Core", async () => {
  const fixture = await runtimeFixture("production");
  const calls = [];
  const systemd = fakeSystemd({ calls, unitDirectory: fixture.unitDirectory, executeRuntime: true });
  const installer = createSystemdRuntimeInstaller({ probe: async () => ({ ok: await exists(fixture.probeFile), status: 200 }), readinessDelayMs: 1, systemd, unitDirectory: fixture.unitDirectory });
  const result = await installer.install({ installationId: "production", readinessAttempts: 3, workspace: fixture.workspace });
  assert.equal(result.ok, true);
  assert.equal(result.readiness.ok, true);
  const processEvidence = JSON.parse(await readFile(fixture.probeFile, "utf8"));
  assert.equal(processEvidence.node, path.join(fixture.workspace, "runtime", "node", "bin", "node"));
  assert.ok(processEvidence.cli.includes("/core/active/framework/src/cli/index.js"));
  assert.deepEqual(calls.slice(0, 3), ["daemon-reload", "enable:wpsc-runtime-production.service", "restart:wpsc-runtime-production.service"]);
});

test("C044 backs up an existing unit and restores it when readiness fails", async () => {
  const fixture = await runtimeFixture("production");
  const unitPath = path.join(fixture.unitDirectory, "wpsc-runtime-production.service");
  const previous = "[Unit]\nDescription=Previous valid WPSC Runtime\n";
  await mkdir(path.dirname(unitPath), { recursive: true });
  await writeFile(unitPath, previous);
  const calls = [];
  const installer = createSystemdRuntimeInstaller({ now: () => "2026-08-04T00:00:00.000Z", probe: async () => ({ ok: false }), readinessDelayMs: 1, systemd: fakeSystemd({ calls, unitDirectory: fixture.unitDirectory }), unitDirectory: fixture.unitDirectory });
  const result = await installer.install({ installationId: "production", readinessAttempts: 2, workspace: fixture.workspace });
  assert.equal(result.ok, false);
  assert.equal(await readFile(unitPath, "utf8"), previous);
  assert.equal(await readFile(result.backupPath, "utf8"), previous);
  assert.equal(calls.filter((call) => call === "daemon-reload").length, 2);
  assert.equal(calls.filter((call) => call === "restart:wpsc-runtime-production.service").length, 2);
});

test("C044 failed first activation leaves no usable systemd unit", async () => {
  const fixture = await runtimeFixture("staging");
  let disabled = null;
  const systemd = { daemonReload: async () => {}, disable: async (unit) => { disabled = unit; }, enable: async () => {}, isActive: async () => false, restart: async () => { throw new Error("restart failed"); } };
  const result = await createSystemdRuntimeInstaller({ systemd, unitDirectory: fixture.unitDirectory }).install({ installationId: "staging", workspace: fixture.workspace });
  assert.equal(result.ok, false);
  assert.equal(disabled, "wpsc-runtime-staging.service");
  await assert.rejects(() => readFile(path.join(fixture.unitDirectory, "wpsc-runtime-staging.service")));
});

test("C044 production and staging units cannot overwrite each other", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c044-multi-"));
  const unitDirectory = path.join(root, "systemd");
  const systemd = fakeSystemd({ calls: [], unitDirectory });
  const installer = createSystemdRuntimeInstaller({ probe: async () => ({ ok: true }), systemd, unitDirectory });
  for (const id of ["production", "staging"]) { const fixture = await runtimeFixture(id, root); await installer.install({ installationId: id, workspace: fixture.workspace }); }
  const production = await readFile(path.join(unitDirectory, "wpsc-runtime-production.service"), "utf8");
  const staging = await readFile(path.join(unitDirectory, "wpsc-runtime-staging.service"), "utf8");
  assert.notEqual(production, staging);
  assert.match(production, /production/);
  assert.match(staging, /staging/);
});

function fakeSystemd({ calls, unitDirectory, executeRuntime = false }) {
  return { daemonReload: async () => { calls.push("daemon-reload"); }, disable: async (unit) => { calls.push(`disable:${unit}`); }, enable: async (unit) => { calls.push(`enable:${unit}`); }, isActive: async () => true, restart: async (unit) => { calls.push(`restart:${unit}`); if (executeRuntime) { const content = await readFile(path.join(unitDirectory, unit), "utf8"); const line = content.split("\n").find((value) => value.startsWith("ExecStart=")); const args = [...line.matchAll(/"((?:\\.|[^"])*)"/g)].map((match) => match[1].replaceAll('\\"', '"').replaceAll("\\\\", "\\")); await execute(args[0], args.slice(1)); } } };
}
async function runtimeFixture(id, existingRoot = null) {
  const root = existingRoot ?? await mkdtemp(path.join(os.tmpdir(), "wpsc-c044-runtime-"));
  const workspace = path.join(root, id);
  const unitDirectory = path.join(root, "systemd");
  const node = path.join(workspace, "runtime", "node", "bin", "node");
  const cli = path.join(workspace, "core", "active", "framework", "src", "cli", "index.js");
  const probeFile = path.join(workspace, "storage", "runtime-process.json");
  await mkdir(path.dirname(node), { recursive: true });
  await writeFile(node, `#!/bin/sh\nexport WPSC_TEST_NODE="$0"\nexec '${process.execPath.replaceAll("'", `'"'"'`)}' "$@"\n`);
  await chmod(node, 0o755);
  await mkdir(path.dirname(cli), { recursive: true });
  await mkdir(path.dirname(probeFile), { recursive: true });
  await mkdir(path.join(workspace, "config"), { recursive: true });
  await writeFile(path.join(workspace, "config", "runtime.env"), "# fixture\n");
  await writeFile(cli, `await import('node:fs/promises').then(({writeFile})=>writeFile('${probeFile.replaceAll("'", "\\'")}',JSON.stringify({node:process.env.WPSC_TEST_NODE,cli:process.argv[1],args:process.argv.slice(2)})));\n`);
  return { probeFile, unitDirectory, workspace };
}
async function exists(file) { return readFile(file).then(() => true, () => false); }
