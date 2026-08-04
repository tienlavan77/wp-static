import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createInstallationHealthService, createInstallationState, InstallationHealthState, REQUIRED_INSTALLATION_HEALTH_CHECKS } from "../framework/src/index.js";

test("C047 persists a complete healthy matrix and Installation report", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "wpsc-c047-healthy-"));
  const service = createInstallationHealthService({ checks: healthyChecks(), now: clock(), workspace });
  const first = await service.inspect({ installation: installation(workspace) });
  assert.equal(first.state, InstallationHealthState.HEALTHY);
  assert.equal(first.matrix.results.length, REQUIRED_INSTALLATION_HEALTH_CHECKS.length);
  assert.equal(first.matrix.revision, 0);
  const persisted = JSON.parse(await readFile(service.path, "utf8"));
  assert.equal(persisted.installation.installationId, "production");
  assert.equal(persisted.installation.workspace, workspace);
  const report = await readFile(service.reportPath, "utf8");
  assert.match(report, /# WPSC Installation Health Report/);
  for (const name of REQUIRED_INSTALLATION_HEALTH_CHECKS) assert.match(report, new RegExp(`\\| ${name.replace("-", "\\-")} \\|`));
  assert.equal((await service.inspect({ installation: installation(workspace) })).matrix.revision, 1);
});

test("C047 records explicit DEGRADED and FAILED states", async () => {
  const degradedRoot = await mkdtemp(path.join(os.tmpdir(), "wpsc-c047-degraded-"));
  const degradedChecks = healthyChecks();
  degradedChecks.nginx = { check: async () => ({ message: "optional warning", ok: false }), severity: "warning" };
  assert.equal((await createInstallationHealthService({ checks: degradedChecks, workspace: degradedRoot }).inspect({ installation: installation(degradedRoot) })).state, "DEGRADED");

  const failedRoot = await mkdtemp(path.join(os.tmpdir(), "wpsc-c047-failed-"));
  const failedChecks = healthyChecks();
  failedChecks.runtime = { check: async () => ({ message: "Runtime unavailable", ok: false }), severity: "critical" };
  const failed = await createInstallationHealthService({ checks: failedChecks, workspace: failedRoot }).inspect({ installation: installation(failedRoot) });
  assert.equal(failed.ok, false);
  assert.equal(failed.state, InstallationHealthState.FAILED);
  assert.match(await readFile(failed.reportPath, "utf8"), /Runtime unavailable/);
});

test("C047 rejects health data for another Installation workspace", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "wpsc-c047-identity-"));
  const service = createInstallationHealthService({ checks: healthyChecks(), workspace });
  await assert.rejects(() => service.inspect({ installation: installation("/another/installation") }), /identity is invalid/);
  await assert.rejects(() => readFile(service.path));
});

test("C047 redacts secret-bearing check details and thrown diagnostics", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "wpsc-c047-redaction-"));
  const checks = healthyChecks();
  checks.registry = { check: async () => ({ details: { password: "must-not-persist", token: "must-not-persist" }, ok: true }) };
  checks.runtime = { check: async () => { throw new Error("credential must-not-persist"); } };
  const service = createInstallationHealthService({ checks, workspace });
  await service.inspect({ installation: installation(workspace) });
  const persisted = await readFile(service.path, "utf8");
  assert.equal(persisted.includes("must-not-persist"), false);
  assert.match(persisted, /\[REDACTED\]/);
});

test("C047 default checks verify Registry, Node, active Core, CLI, systemd, Runtime and Nginx", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "wpsc-c047-defaults-"));
  const node = path.join(workspace, "runtime", "node", "bin", "node");
  const cli = path.join(workspace, "core", "releases", "1.0.0", "framework", "src", "cli", "index.js");
  const command = path.join(workspace, "bin", "wpsc");
  for (const file of [node, cli, command]) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, "fixture"); await chmod(file, 0o755); }
  await symlink("releases/1.0.0", path.join(workspace, "core", "active"));
  let runtimeProbes = 0; let nginxChecks = 0;
  const service = createInstallationHealthService({
    commandPath: command,
    nginx: { validate: async () => { nginxChecks += 1; return { ok: true }; } },
    registry: { read: async () => ({ installations: { production: { workspace } } }) },
    runtimeProbe: async () => { runtimeProbes += 1; return { details: { status: 200 }, ok: true }; },
    systemd: { isActive: async (unit) => unit === "wpsc-runtime-production.service" },
    workspace
  });
  const inspected = await service.inspect({ installation: installation(workspace) });
  assert.equal(inspected.state, "HEALTHY");
  assert.equal(runtimeProbes, 1);
  assert.equal(nginxChecks, 1);
  assert.equal(inspected.matrix.results.every((result) => result.ok), true);
});

function healthyChecks() { return Object.fromEntries(REQUIRED_INSTALLATION_HEALTH_CHECKS.map((name) => [name, { check: async () => ({ details: { check: name }, ok: true }), severity: "critical" }])); }
function installation(workspace) { return createInstallationState({ activeCore: "releases/1.0.0", coreVersion: "1.0.0", installationId: "production", nodeVersion: "26.3.1", productVersion: "1.0.0", revision: 5, runtimeUser: "www-data", state: "READY", workspace }); }
function clock() { let tick = 0; return () => `2026-08-04T00:00:0${tick++}.000Z`; }
