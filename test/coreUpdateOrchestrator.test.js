import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { mkdtemp, mkdir, readFile, readlink, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createCoreUpdateOrchestrator from "../framework/src/product/update/createCoreUpdateOrchestrator.js";
import createCoreUpdateCoordinator, { createCoreHealthChecks, validateCoreHealthCheckOwnership } from "../framework/src/product/update/createCoreUpdateCoordinator.js";
import createCoreUpdateService from "../framework/src/product/update/createCoreUpdateService.js";
import createProductManagementCli from "../framework/src/cli/createProductManagementCli.js";
import createCorePackageContent from "../framework/src/product/update/createCorePackageContent.js";

async function scenario(healthState = "COMPLETED") {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-update-e2e-"));
  const calls = [];
  const yes = (name, value = {}) => async () => { calls.push(name); return { ok: true, ...value }; };
  const services = {
    activation: { activate: yes("activate") }, health: { verify: yes("health", { state: healthState }) },
    lifecycle: createCoreUpdateService({ createId: () => "update-e2e", workspaceDir }),
    migration: { validate: yes("migrate") }, planner: { plan: yes("plan", { plan: { currentVersion: "1.0.0", package: { packageId: "wpsc-1.1.0", version: "1.1.0" } } }) },
    recovery: { create: yes("backup") }, staging: { stage: yes("stage") }, verifier: { verify: yes("verify") }
  };
  services.release = { check: async () => ({ currentVersion: "1.0.0", ok: true, status: "UPDATE_AVAILABLE" }) };
  return { calls, orchestrator: createCoreUpdateOrchestrator({ services }), services, workspaceDir };
}

test("C037 orchestrates a healthy Core update through every frozen owner", async () => { const value = await scenario(); try { const result = await value.orchestrator.run({ package: {}, recoveryId: "before" }); assert.equal(result.ok, true); assert.deepEqual(value.calls, ["plan", "verify", "backup", "stage", "migrate", "activate", "health"]); assert.equal((await value.services.lifecycle.status()).update.state, "COMPLETED"); } finally { await rm(value.workspaceDir, { force: true, recursive: true }); } });

test("C037 records the rollback lifecycle after post-activation health failure", async () => { const value = await scenario("ROLLED_BACK"); try { const result = await value.orchestrator.run({ package: {}, recoveryId: "before" }); assert.equal(result.rolledBack, true); assert.equal((await value.services.lifecycle.status()).update.state, "ROLLED_BACK"); } finally { await rm(value.workspaceDir, { force: true, recursive: true }); } });

test("C037 coordinator exposes check, plan, status and history ownership", async () => { const value = await scenario(); try { assert.equal((await value.orchestrator.check()).status, "UPDATE_AVAILABLE"); assert.equal((await value.orchestrator.plan()).plan.package.version, "1.1.0"); assert.equal((await value.orchestrator.status()).update.state, "IDLE"); assert.deepEqual((await value.orchestrator.history()).history, []); } finally { await rm(value.workspaceDir, { force: true, recursive: true }); } });

test("C037 production health ownership rejects a missing active Core", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-update-health-contract-"));
  try {
    const checks = createCoreHealthChecks(workspaceDir);
    assert.equal(validateCoreHealthCheckOwnership(checks), true);
    assert.equal((await checks.runtime()).ok, false);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("C037 production health ownership resolves every component through core active", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-update-active-health-"));
  const release = path.join(workspaceDir, "core/releases/1.0.0");
  try {
    for (const relative of ["framework/src/cli/index.js", "framework/src/scheduler/policy/createScheduler.js", "framework/src/scheduler/dispatcher/createJobDispatcher.js", "framework/src/scheduler/queue/.keep", "framework/src/build/createBuildIntegration.js"]) {
      await mkdir(path.dirname(path.join(release, relative)), { recursive: true });
      await writeFile(path.join(release, relative), "fixture");
    }
    await symlink("releases/1.0.0", path.join(workspaceDir, "core/active"));
    const checks = createCoreHealthChecks(workspaceDir);
    for (const check of Object.values(checks)) assert.equal((await check()).ok, true);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("C037 executes healthy, rollback and recovery updates without mutating Sites or secrets", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-update-real-e2e-"));
  const keys = generateKeyPairSync("ed25519");
  const publicKey = keys.publicKey.export({ format: "pem", type: "spki" });
  const configuration = { validate: async () => ({ diagnostics: { errors: [], warnings: [] }, ok: true }) };
  const repository = { readMetadata: async () => ({}), readRegistry: async () => ({ sites: [] }) };
  const healthChecks = Object.fromEntries(["runtime", "scheduler", "queue", "dispatcher", "buildIntegration"].map((name) => [name, async () => {
    if (name !== "runtime") return { ok: true };
    const active = await readlink(path.join(workspaceDir, "core/active"));
    try { await readFile(path.join(workspaceDir, "core", active, ".wpsc-health-fail")); return { ok: false }; }
    catch (error) { if (error.code === "ENOENT") return { ok: true }; throw error; }
  }]));
  try {
    await mkdir(path.join(workspaceDir, "core/releases/1.0.0"), { recursive: true });
    await mkdir(path.join(workspaceDir, "sites/site-a/config"), { recursive: true });
    await writeFile(path.join(workspaceDir, "core/releases/1.0.0/core.js"), "stable-1.0.0");
    await symlink("releases/1.0.0", path.join(workspaceDir, "core/active"));
    await writeFile(path.join(workspaceDir, "sites/site-a/config/site.json"), "site-state");
    await writeFile(path.join(workspaceDir, "sites/site-a/config/source-credentials.json"), "credential-state");
    const siteBefore = digest(await readFile(path.join(workspaceDir, "sites/site-a/config/site.json")));
    const secretBefore = digest(await readFile(path.join(workspaceDir, "sites/site-a/config/source-credentials.json")));

    await installRelease(workspaceDir, keys.privateKey, "1.1.0");
    let coordinator = createCoreUpdateCoordinator({ architecture: "2.02", configuration, currentVersion: "1.0.0", healthChecks, publicKey, repository, runtime: "1.0", workspaceDir });
    const cli = productCli(coordinator);
    assert.equal((await cli.run(["update", "check"])).result.status, "UPDATE_AVAILABLE");
    assert.equal((await cli.run(["update", "plan"])).code, 0);
    const healthy = await cli.run(["update"]);
    assert.equal(healthy.code, 0, healthy.output);
    assert.equal((await cli.run(["update", "status"])).result.update.state, "COMPLETED");
    assert.ok((await cli.run(["update", "history"])).result.history.length > 0);
    assert.equal(await readlink(path.join(workspaceDir, "core/active")), "releases/1.1.0");

    await installRelease(workspaceDir, keys.privateKey, "1.2.0", { broken: true });
    coordinator = createCoreUpdateCoordinator({ architecture: "2.02", configuration, currentVersion: "1.1.0", healthChecks, publicKey, repository, runtime: "1.0", workspaceDir });
    const broken = await coordinator.run();
    assert.equal(broken.rolledBack, true, JSON.stringify(broken));
    assert.equal(await readlink(path.join(workspaceDir, "core/active")), "releases/1.1.0");

    await installRelease(workspaceDir, keys.privateKey, "1.2.1");
    coordinator = createCoreUpdateCoordinator({ architecture: "2.02", configuration, currentVersion: "1.1.0", healthChecks, publicKey, repository, runtime: "1.0", workspaceDir });
    assert.equal((await coordinator.run()).ok, true);
    assert.equal(await readlink(path.join(workspaceDir, "core/active")), "releases/1.2.1");
    assert.equal(digest(await readFile(path.join(workspaceDir, "sites/site-a/config/site.json"))), siteBefore);
    assert.equal(digest(await readFile(path.join(workspaceDir, "sites/site-a/config/source-credentials.json"))), secretBefore);
    assert.equal((await coordinator.status()).update.state, "COMPLETED");
    assert.ok((await coordinator.history()).history.length > 0);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

async function installRelease(workspaceDir, privateKey, version, options = {}) {
  const packageId = `wpsc-${version}`;
  const root = path.join(workspaceDir, "storage/core-releases", packageId);
  await rm(path.join(workspaceDir, "storage/core-releases"), { force: true, recursive: true });
  await mkdir(path.join(root, "core"), { recursive: true });
  await writeFile(path.join(root, "core/core.js"), `core-${version}`);
  if (options.broken) await writeFile(path.join(root, "core/.wpsc-health-fail"), "intentional C037 failure");
  const content = await createCorePackageContent(path.join(root, "core"));
  await writeFile(path.join(root, "package.bin"), content);
  await writeFile(path.join(root, "manifest.json"), JSON.stringify({ architecture: "2.02", checksum: digest(content), product: "wpsc", runtime: "1.0", signature: sign(null, content, privateKey).toString("base64"), version }));
  await writeFile(path.join(workspaceDir, "storage/core-releases/releases.json"), JSON.stringify([{ architecture: "2.02", packageId, product: "wpsc", runtime: "1.0", version }]));
}

function digest(value) { return createHash("sha256").update(value).digest("hex"); }

function productCli(update) {
  return createProductManagementCli({
    backup: { list: async () => ({ ok: true }) },
    deployment: { status: async () => ({ ok: true }) },
    operations: { inspect: async () => ({ ok: true }), list: async () => ({ ok: true }) },
    registry: { read: async () => ({ sites: [] }) },
    update
  });
}
