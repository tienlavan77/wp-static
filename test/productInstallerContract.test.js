import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createInstallationPlan,
  createInstallationRegistryService,
  createInstallationStateService,
  createInstallationTransactionService,
  createPrivilegedInstallationExecutor,
  executeNginxActivationBoundary,
  InstallationTransactionState,
  INSTALLER_OWNED_REPAIR_ARTIFACTS,
  NginxInstallationOwnership,
  PrivilegedInstallationOperation,
  REPAIR_PROTECTED_RESOURCES,
  resolveInstallationWorkspace
} from "../framework/src/index.js";

test("C038 Installation transaction enforces forward, failure and recovery lifecycles", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "wpsc-c038-transaction-"));
  const service = createInstallationTransactionService({ createId: () => "tx-1", now: clock(), workspace });
  assert.equal((await service.start({ installationId: "production", ownerId: "installer-a" })).transaction.state, "PLANNING");
  assert.equal((await service.start({ installationId: "production", ownerId: "installer-b" })).diagnostics.errors[0].code, "installation.transaction.active");
  for (const state of ["PREFLIGHTED", "DOWNLOADING", "VERIFIED", "EXTRACTING", "BOOTSTRAPPING", "CONFIGURING", "SERVICE_INSTALLING", "HEALTH_CHECK", "COMPLETED"]) {
    assert.equal((await service.transition({ fence: 1, ownerId: "installer-a", state })).transaction.state, state);
  }
  assert.equal((await service.status()).transaction.revision, 9);
  await service.start({ installationId: "production", ownerId: "installer-a", transactionId: "tx-2" });
  await service.transition({ error: "download failed", fence: 1, ownerId: "installer-a", state: "FAILED" });
  assert.equal((await service.resume()).nextAction, "recover");
  await service.transition({ fence: 1, ownerId: "installer-a", recovery: { resources: ["installation-state", "mutable-directories"] }, state: "RECOVERING" });
  let recoveryCalls = 0;
  const restarted = createInstallationTransactionService({ now: clock(), recoveryHandler: async ({ idempotencyKey }) => { assert.equal(idempotencyKey, "tx-2:recovery"); recoveryCalls += 1; }, workspace });
  assert.deepEqual(await restarted.resume().then((result) => [result.transaction.state, result.nextAction]), ["RECOVERING", "complete-rollback"]);
  const rolledBack = (await restarted.completeRecovery({ fence: 1, ownerId: "installer-a" })).transaction;
  assert.equal(rolledBack.state, "ROLLED_BACK");
  assert.equal(rolledBack.revision, 3);
  assert.equal((await restarted.completeRecovery({ fence: 1, ownerId: "installer-a" })).alreadyCompleted, true);
  assert.equal(recoveryCalls, 1);
  assert.equal((await restarted.status()).transaction.revision, 3);
});

test("C038 Installation state revisions are atomic and persistence failure preserves the previous state", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "wpsc-c038-state-"));
  const service = createInstallationStateService({ now: clock(), workspace });
  await service.save({ activeCore: "core/releases/1.0.0", coreVersion: "1.0.0", installationId: "production", nodeVersion: "v26.3.1", password: "state-password", productVersion: "1.0.0", state: "READY", token: "state-token" });
  const before = await readFile(service.path, "utf8");
  const failing = createInstallationStateService({ store: { path: service.path, read: () => service.read(), write: async () => { throw Object.assign(new Error("simulated persistence failure"), { code: "EIO" }); } }, workspace });
  await assert.rejects(() => failing.save({ installationId: "production", state: "FAILED" }), /simulated persistence failure/);
  assert.equal(await readFile(service.path, "utf8"), before);
  const state = await service.read();
  assert.equal(state.revision, 0);
  assert.equal(state.state, "READY");
  assert.equal(JSON.stringify(state).includes("credential"), false);
  assert.equal(before.includes("state-password"), false);
  assert.equal(before.includes("state-token"), false);
  await assert.rejects(() => service.save({ installationId: "staging" }), (error) => error.code === "installation.identity.immutable");
  await assert.rejects(() => service.save({ installationId: "production", workspace: "/another/workspace" }), (error) => error.code === "installation.workspace.immutable");
  await assert.rejects(() => service.save({ expectedRevision: 99, installationId: "production" }), (error) => error.code === "installation.revision.stale");
});

test("C038 resolves multiple Installations deterministically without cwd inference", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c038-registry-"));
  const registry = createInstallationRegistryService({ path: path.join(root, "installations.json") });
  await registry.save({ defaultInstallation: "production", installations: { production: { workspace: "/srv/wpsc/production" }, staging: { workspace: "/srv/wpsc/staging" } } });
  assert.equal((await resolveInstallationWorkspace({ installation: "staging", registry })).workspace, "/srv/wpsc/staging");
  assert.equal((await resolveInstallationWorkspace({ environmentRoot: "/env/root", installation: "staging", project: "/explicit", registry })).source, "project");
  assert.equal((await resolveInstallationWorkspace({ registry })).installationId, "production");
  const noDefault = createInstallationRegistryService({ path: path.join(root, "no-default.json") });
  await noDefault.save({ installations: { production: { workspace: "/srv/wpsc/production" } } });
  assert.equal((await resolveInstallationWorkspace({ registry: noDefault })).diagnostics.errors[0].code, "installation.selection.required");
  assert.equal((await resolveInstallationWorkspace({})).ok, false);
});

test("C038 planner dry-run is mutation-free and executor rejects unauthorized operations", async () => {
  let calls = 0;
  const executor = createPrivilegedInstallationExecutor({ handlers: { [PrivilegedInstallationOperation.PREPARE_DIRECTORIES]: async () => { calls += 1; } } });
  const dryRun = createInstallationPlan({ dryRun: true, installationId: "production", operations: [{ arguments: { workspace: "/srv/wpsc" }, type: "prepare-directories" }], workspace: "/srv/wpsc" });
  assert.equal((await executor.execute(dryRun)).results[0].executed, false);
  assert.equal(calls, 0);
  await executor.execute({ ...dryRun, dryRun: false });
  assert.equal(calls, 1);
  await assert.rejects(() => executor.execute({ dryRun: false, operations: [{ type: "delete-site" }] }), /not allowed/);
  assert.throws(() => createInstallationPlan({ installationId: "production", operations: [{ type: "replace-database" }] }), /not allowed/);

  const workspace = await mkdtemp(path.join(os.tmpdir(), "wpsc-c038-tampered-plan-"));
  const transactionService = createInstallationTransactionService({ workspace });
  await transactionService.start({ installationId: "production", ownerId: "installer-a", plan: { dryRun: false, operations: [{ type: "run-arbitrary-command" }] } });
  const persistedPlan = (await transactionService.status()).transaction.plan;
  await assert.rejects(() => executor.execute(persistedPlan), /not allowed/);
});

test("C038 dry-run produces zero installation infrastructure mutation", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c038-dry-run-"));
  const targets = ["config/installation-state.json", "registry.json", "storage/installer", "systemd.backup", "nginx.conf", "node.tar.xz"];
  const executor = createPrivilegedInstallationExecutor({ handlers: Object.fromEntries(Object.values(PrivilegedInstallationOperation).map((type) => [type, async () => writeFile(path.join(root, type), "mutated")])) });
  const plan = createInstallationPlan({ dryRun: true, installationId: "production", mode: "REINSTALL", operations: Object.values(PrivilegedInstallationOperation).map((type) => ({ type })), workspace: root });
  await executor.execute(plan);
  for (const target of [...targets, ...Object.values(PrivilegedInstallationOperation)]) await assert.rejects(() => access(path.join(root, target)));
});

test("C038 repair preserves Site, credential, public, database and active Core sentinels", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c038-repair-"));
  const protectedFiles = ["runtime.env", "sites/site.json", "sites/credentials.json", "public/index.html", "database.sqlite", "core/active"];
  for (const file of protectedFiles) { await mkdir(path.dirname(path.join(root, file)), { recursive: true }); await writeFile(path.join(root, file), `sentinel:${file}`); }
  const before = await Promise.all(protectedFiles.map((file) => readFile(path.join(root, file), "utf8")));
  const plan = createInstallationPlan({ installationId: "production", mode: "REPAIR", operations: [{ type: "prepare-directories" }, { type: "install-global-command" }, { type: "install-systemd" }, { type: "activate-nginx" }], workspace: root });
  const executor = createPrivilegedInstallationExecutor({ handlers: Object.fromEntries(plan.operations.map(({ type }) => [type, async () => writeFile(path.join(root, `owned-${type}`), "repaired")])) });
  await executor.execute(plan);
  assert.deepEqual(await Promise.all(protectedFiles.map((file) => readFile(path.join(root, file), "utf8"))), before);
  assert.throws(() => createInstallationPlan({ installationId: "production", mode: "REPAIR", operations: [{ type: "install-node" }] }), /Repair operation is not allowed/);
});

test("C038 locks repair and Nginx ownership boundaries", () => {
  assert.deepEqual(INSTALLER_OWNED_REPAIR_ARTIFACTS, ["global-command", "systemd-unit", "nginx-managed-config", "mutable-directories", "installation-state"]);
  assert.ok(REPAIR_PROTECTED_RESOURCES.includes("credentials"));
  assert.ok(REPAIR_PROTECTED_RESOURCES.includes("public-output"));
  assert.equal(NginxInstallationOwnership.validationCommand, "nginx -t");
  assert.equal(NginxInstallationOwnership.operatorConfig, "operator");
  assert.equal(NginxInstallationOwnership.activation, "atomic-after-validation");
});

test("C038 registry persistence increments revision without partial JSON", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c038-registry-revision-"));
  const file = path.join(root, "registry.json");
  const registry = createInstallationRegistryService({ path: file });
  assert.equal((await registry.save({ installations: { production: { password: "registry-password", token: "registry-token", workspace: root } } })).revision, 0);
  assert.equal((await registry.save({ defaultInstallation: "production" })).revision, 1);
  assert.equal(JSON.parse(await readFile(file, "utf8")).revision, 1);
  assert.equal((await readFile(file, "utf8")).includes("registry-password"), false);
  assert.equal((await readFile(file, "utf8")).includes("registry-token"), false);
  await writeFile(`${file}.partial.tmp`, "{", "utf8");
  assert.equal((await registry.read()).defaultInstallation, "production");
});

test("C038 registry persistence failure preserves bytes and concurrent writers cannot lose updates", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c038-registry-atomic-"));
  const file = path.join(root, "registry.json");
  const registry = createInstallationRegistryService({ path: file });
  await registry.save({ defaultInstallation: "a", installations: { a: { workspace: "/srv/a" }, b: { workspace: "/srv/b" } } });
  const before = await readFile(file, "utf8");
  const failing = createInstallationRegistryService({
    lockPath: path.join(root, "failure.lock"),
    store: { path: file, read: () => registry.read(), write: async () => { throw Object.assign(new Error("simulated registry persistence failure"), { code: "EIO" }); } }
  });
  await assert.rejects(() => failing.save({ installations: { c: { workspace: "/srv/c" } } }), /simulated registry persistence failure/);
  assert.equal(await readFile(file, "utf8"), before);
  assert.deepEqual(Object.keys((await registry.read()).installations), ["a", "b"]);

  const concurrent = await Promise.allSettled([
    registry.save({ installations: { c: { workspace: "/srv/c" } } }),
    registry.save({ installations: { d: { workspace: "/srv/d" } } })
  ]);
  assert.deepEqual(concurrent.map((entry) => entry.status), ["fulfilled", "fulfilled"]);
  const finalRegistry = await registry.read();
  assert.deepEqual(Object.keys(finalRegistry.installations), ["a", "b", "c", "d"]);
  assert.equal(finalRegistry.revision, 2);
  await assert.rejects(() => registry.save({ installations: { a: { workspace: "/srv/other" } } }), (error) => error.code === "installation.registry.identity_mismatch");
  await assert.rejects(() => registry.save({ expectedRevision: 0 }), (error) => error.code === "installation.registry.revision_stale");
});

test("C038 rejects stale transaction writers without losing checkpoints", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "wpsc-c038-stale-"));
  const first = createInstallationTransactionService({ workspace });
  const second = createInstallationTransactionService({ workspace });
  await first.start({ installationId: "production", ownerId: "installer-a", transactionId: "stale-test" });
  assert.equal((await first.transition({ expectedRevision: 0, fence: 1, ownerId: "installer-a", state: "PREFLIGHTED" })).ok, true);
  const stale = await second.transition({ expectedRevision: 0, fence: 1, ownerId: "installer-a", state: "PREFLIGHTED" });
  assert.equal(stale.diagnostics.errors[0].code, "installation.revision.stale");
  const current = (await first.status()).transaction;
  assert.equal(current.revision, 1);
  assert.equal(current.checkpoints.length, 1);
});

test("C038 stale ownership claim fences the previous Installer process", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "wpsc-c038-fence-"));
  const oldProcess = createInstallationTransactionService({ now: () => "2026-08-04T00:00:00.000Z", staleAfterMs: 1000, workspace });
  await oldProcess.start({ installationId: "production", ownerId: "old-process", transactionId: "fenced" });
  const newProcess = createInstallationTransactionService({ now: () => "2026-08-04T00:01:00.000Z", staleAfterMs: 1000, workspace });
  assert.equal((await newProcess.resume()).nextAction, "claim-stale-transaction");
  const claimed = await newProcess.claim({ ownerId: "new-process" });
  assert.equal(claimed.transaction.fence, 2);
  const fenced = await oldProcess.transition({ fence: 1, ownerId: "old-process", state: "PREFLIGHTED" });
  assert.equal(fenced.diagnostics.errors[0].code, "installation.owner.fenced");
  assert.equal((await newProcess.transition({ fence: 2, ownerId: "new-process", state: "PREFLIGHTED" })).ok, true);
});

test("C038 recovers a crash after external mutation intent without duplicating effects", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "wpsc-c038-external-recovery-"));
  const sentinel = path.join(workspace, "installer-owned-service.unit");
  let attempts = 0;
  const crashing = createInstallationTransactionService({
    mutationHandlers: { "install-systemd": async ({ idempotencyKey }) => { attempts += 1; await writeFile(sentinel, idempotencyKey); throw new Error("process crashed after external mutation"); } },
    workspace
  });
  await crashing.start({ installationId: "production", ownerId: "installer-a", transactionId: "external" });
  await assert.rejects(() => crashing.runOperation({ fence: 1, operationId: "systemd", ownerId: "installer-a", type: "install-systemd" }), /process crashed/);
  assert.equal(await readFile(sentinel, "utf8"), "external:systemd");
  const inspected = await createInstallationTransactionService({ workspace }).resume();
  assert.equal(inspected.nextAction, "recover-external-operation");
  assert.equal(inspected.transaction.activeOperation.phase, "INTENT_PERSISTED");

  const restarted = createInstallationTransactionService({ mutationHandlers: { "install-systemd": async ({ idempotencyKey }) => { attempts += 1; assert.equal(await readFile(sentinel, "utf8"), idempotencyKey); } }, workspace });
  const recovered = await restarted.runOperation({ fence: 1, operationId: "systemd", ownerId: "installer-a", type: "install-systemd" });
  assert.equal(recovered.ok, true);
  assert.equal(recovered.transaction.activeOperation, null);
  assert.equal(attempts, 2);
  assert.equal(await readFile(sentinel, "utf8"), "external:systemd");
});

test("C038 cross-process transaction lock admits only one installer", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "wpsc-c038-install-lock-"));
  const services = [createInstallationTransactionService({ workspace }), createInstallationTransactionService({ workspace })];
  const results = await Promise.all(services.map((service, index) => service.start({ installationId: "production", ownerId: `installer-${index}`, transactionId: `installer-${index}` })));
  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.equal(results.filter((result) => !result.ok).length, 1);
  assert.ok(["installation.lock.active", "installation.transaction.active"].includes(results.find((result) => !result.ok).diagnostics.errors[0].code));
});

test("C038 recovery scope rejects Site and Core Update resources", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "wpsc-c038-recovery-scope-"));
  const service = createInstallationTransactionService({ workspace });
  await service.start({ installationId: "production", ownerId: "installer-a" });
  await service.transition({ fence: 1, ownerId: "installer-a", state: "FAILED" });
  await assert.rejects(() => service.transition({ fence: 1, ownerId: "installer-a", recovery: { resources: ["site-state", "core/active"] }, state: "RECOVERING" }), /does not own resource/);
  assert.equal((await service.status()).transaction.state, "FAILED");
});

test("C038 restart matrix returns a deterministic action for every crash checkpoint", async () => {
  const expected = { PLANNING: "preflight", PREFLIGHTED: "download", DOWNLOADING: "verify", VERIFIED: "extract", EXTRACTING: "bootstrap", BOOTSTRAPPING: "configure", CONFIGURING: "install-services", SERVICE_INSTALLING: "health-check", HEALTH_CHECK: "complete", FAILED: "recover", RECOVERING: "complete-rollback" };
  const workspace = await mkdtemp(path.join(os.tmpdir(), "wpsc-c038-crash-matrix-"));
  const service = createInstallationTransactionService({ workspace });
  await service.start({ installationId: "production", ownerId: "installer-a" });
  assert.equal((await createInstallationTransactionService({ workspace }).resume()).nextAction, expected.PLANNING);
  for (const state of ["PREFLIGHTED", "DOWNLOADING", "VERIFIED", "EXTRACTING", "BOOTSTRAPPING", "CONFIGURING", "SERVICE_INSTALLING", "HEALTH_CHECK"]) {
    await service.transition({ fence: 1, ownerId: "installer-a", state });
    assert.equal((await createInstallationTransactionService({ workspace }).resume()).nextAction, expected[state]);
  }
  await service.transition({ error: { code: "fixture", password: "must-not-persist", token: "must-not-persist" }, fence: 1, ownerId: "installer-a", state: "FAILED" });
  assert.equal((await createInstallationTransactionService({ workspace }).resume()).nextAction, expected.FAILED);
  await service.transition({ fence: 1, ownerId: "installer-a", recovery: { resources: ["installation-state"] }, state: "RECOVERING" });
  assert.equal((await createInstallationTransactionService({ workspace }).resume()).nextAction, expected.RECOVERING);
  const serialized = await readFile(path.join(workspace, "storage", "installer", "transaction.json"), "utf8");
  for (const forbidden of ["must-not-persist", "password", "token", "secret", "privateKey", "credential"]) assert.equal(serialized.includes(forbidden), false);
});

test("C038 Nginx validation failure leaves active operator configuration unchanged", async () => {
  let active = "operator-owned";
  let reloads = 0;
  const failed = await executeNginxActivationBoundary({ activate: async (value) => { active = value; }, reload: async () => { reloads += 1; }, render: async () => "wpsc-desired", validate: async () => ({ ok: false }) });
  assert.equal(failed.activated, false);
  assert.equal(active, "operator-owned");
  assert.equal(reloads, 0);
  const passed = await executeNginxActivationBoundary({ activate: async (value) => { active = value; }, reload: async () => { reloads += 1; }, render: async () => "wpsc-desired", validate: async () => ({ ok: true }) });
  assert.equal(passed.ok, true);
  assert.equal(active, "wpsc-desired");
  assert.equal(reloads, 1);
});

function clock() {
  let tick = 0;
  return () => `2026-08-04T00:00:${String(tick++).padStart(2, "0")}.000Z`;
}
