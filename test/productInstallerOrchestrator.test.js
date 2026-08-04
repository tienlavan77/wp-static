import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createInstallationTransactionService from "../framework/src/product/installer/createInstallationTransactionService.js";
import createProductInstallerOrchestrator from "../framework/src/product/installer/createProductInstallerOrchestrator.js";

async function workspace() { return mkdtemp(path.join(os.tmpdir(), "wpsc-c047-")); }

function fixture(overrides = {}) {
  const calls = [];
  const ok = (name, extra = {}) => async (input) => { calls.push({ input, name }); return { diagnostics: { errors: [], warnings: [] }, ok: true, ...extra }; };
  const components = {
    preflight: ok("preflight"),
    node: { install: ok("node") },
    acquisition: { acquire: ok("acquire", { packageDir: "/acquired/package" }) },
    package: {
      extract: ok("extract", { extracted: true }),
      verifyPackage: ok("verify", { accepted: true, manifest: { product: { version: "1.0.0" }, schema: "wpsc.production-package" } })
    },
    bootstrap: { bootstrap: ok("bootstrap") },
    globalCommand: { install: ok("global-command") },
    systemd: { install: ok("systemd") },
    nginx: { install: ok("nginx") },
    health: { inspect: ok("health", { state: "HEALTHY" }) },
    ...overrides
  };
  return { calls, components };
}

function input(root, extra = {}) {
  return {
    acquisition: { productId: "wpsc", sha256: "a".repeat(64), size: 1, targetDir: path.join(root, "storage", "installer", "packages", "1.0.0"), url: "https://releases.example.test/wpsc-1.0.0.json", version: "1.0.0" },
    bootstrap: {},
    globalCommand: {},
    health: {},
    installationId: "production",
    nginx: {},
    node: {},
    ownerId: "installer-1",
    package: { packageDir: path.join(root, "package"), publicKey: "test", targetDir: path.join(root, "storage", "installer", "extracted", "1.0.0") },
    systemd: {},
    transactionId: "install-production-1",
    workspace: root,
    ...extra
  };
}

test("C047 orchestrates the complete Installation lifecycle in deterministic order", async () => {
  const root = await workspace();
  const { calls, components } = fixture();
  const result = await createProductInstallerOrchestrator({ components }).install(input(root));

  assert.equal(result.ok, true);
  assert.equal(result.state, "COMPLETED");
  assert.deepEqual(calls.map(({ name }) => name), ["preflight", "node", "acquire", "verify", "verify", "extract", "verify", "bootstrap", "global-command", "systemd", "nginx", "health"]);
  assert.equal(calls.find(({ name }) => name === "verify").input.packageDir, input(root).acquisition.targetDir);
  assert.equal(calls.find(({ name }) => name === "extract").input.targetDir, input(root).package.targetDir);
  assert.equal(calls.find(({ name }) => name === "bootstrap").input.extractedPath, input(root).package.targetDir);
  const persisted = JSON.parse(await readFile(path.join(root, "storage", "installer", "transaction.json"), "utf8"));
  assert.equal(persisted.state, "COMPLETED");
  assert.deepEqual(persisted.plan.phases, ["preflight", "node", "verify", "extract", "bootstrap", "global-command", "systemd", "nginx", "health"]);
  assert.equal(persisted.activeOperation, null);
  for (const operationId of ["node", "package-download", "package", "core", "global-command", "systemd", "nginx", "health"]) assert.ok(persisted.checkpoints.some((checkpoint) => checkpoint.operationId === operationId));
});

test("C047 resumes persisted lifecycle checkpoints without replaying completed phases", async () => {
  for (const state of ["DOWNLOADING", "EXTRACTING", "BOOTSTRAPPING", "SERVICE_INSTALLING", "HEALTH_CHECK"]) {
    const root = await workspace();
    const data = input(root);
    const seed = createInstallationTransactionService({ workspace: root });
    let current = (await seed.start({ installationId: data.installationId, ownerId: data.ownerId, plan: {}, transactionId: data.transactionId })).transaction;
    for (const next of pathTo(state)) current = (await seed.transition({ fence: current.fence, ownerId: data.ownerId, state: next })).transaction;
    const { calls, components } = fixture();
    const result = await createProductInstallerOrchestrator({ components }).resume(data);
    assert.equal(result.state, "COMPLETED", state);
    const names = calls.map(({ name }) => name);
    if (state !== "DOWNLOADING") assert.equal(names.includes("node"), false, state);
    if (["SERVICE_INSTALLING", "HEALTH_CHECK"].includes(state)) assert.equal(names.includes("bootstrap"), false, state);
    if (state === "HEALTH_CHECK") assert.deepEqual(names, ["health"]);
  }
});

test("C047 replays an intent-persisted external operation with the same idempotency key after restart", async () => {
  const root = await workspace();
  const data = input(root);
  let current;
  const seed = createInstallationTransactionService({
    mutationHandlers: { "install-node": async () => { throw new Error("simulated process interruption"); } },
    workspace: root
  });
  current = (await seed.start({ installationId: data.installationId, ownerId: data.ownerId, plan: {}, transactionId: data.transactionId })).transaction;
  current = (await seed.transition({ fence: current.fence, ownerId: data.ownerId, state: "PREFLIGHTED" })).transaction;
  current = (await seed.transition({ fence: current.fence, ownerId: data.ownerId, state: "DOWNLOADING" })).transaction;
  await assert.rejects(seed.runOperation({ fence: current.fence, operationId: "node", ownerId: data.ownerId, type: "install-node" }), /simulated process interruption/);
  const interrupted = (await seed.status()).transaction;
  assert.deepEqual(interrupted.activeOperation, { id: "node", phase: "INTENT_PERSISTED", type: "install-node" });

  const { calls, components } = fixture();
  const result = await createProductInstallerOrchestrator({ components }).resume(data);
  assert.equal(result.state, "COMPLETED");
  assert.equal(calls.filter(({ name }) => name === "node").length, 1);
  assert.equal(result.transaction.activeOperation, null);
});

test("C047 resumes an interrupted package acquisition without publishing a partial verification", async () => {
  const root = await workspace();
  const data = input(root);
  const keys = [];
  const seed = createInstallationTransactionService({
    mutationHandlers: {
      "acquire-package": async ({ idempotencyKey }) => { keys.push(idempotencyKey); throw new Error("download interrupted"); },
      "install-node": async () => {}
    },
    workspace: root
  });
  let current = (await seed.start({ installationId: data.installationId, ownerId: data.ownerId, plan: {}, transactionId: data.transactionId })).transaction;
  current = (await seed.transition({ fence: current.fence, ownerId: data.ownerId, state: "PREFLIGHTED" })).transaction;
  current = (await seed.transition({ fence: current.fence, ownerId: data.ownerId, state: "DOWNLOADING" })).transaction;
  current = (await seed.runOperation({ fence: current.fence, operationId: "node", ownerId: data.ownerId, type: "install-node" })).transaction;
  await assert.rejects(seed.runOperation({ fence: current.fence, operationId: "package-download", ownerId: data.ownerId, type: "acquire-package" }), /download interrupted/);
  assert.equal((await seed.status()).transaction.activeOperation.id, "package-download");

  const { calls, components } = fixture();
  components.acquisition.acquire = async (value) => { keys.push(value.idempotencyKey); calls.push({ input: value, name: "acquire" }); return { ok: true, packageDir: value.targetDir }; };
  const result = await createProductInstallerOrchestrator({ components }).resume(data);
  assert.equal(result.state, "COMPLETED");
  assert.deepEqual(keys, [`${data.transactionId}:package-download`, `${data.transactionId}:package-download`]);
  assert.equal(calls.filter(({ name }) => name === "node").length, 0);
  assert.ok(calls.findIndex(({ name }) => name === "acquire") < calls.findIndex(({ name }) => name === "verify"));
});

test("C047 persists a redacted FAILED state and never advances through an unhealthy installation", async () => {
  const root = await workspace();
  const secret = "do-not-persist-this-token";
  const { components } = fixture({ health: { inspect: async () => ({ diagnostics: { errors: [{ code: "probe.failed", message: secret, severity: "error" }], warnings: [] }, ok: false, state: "FAILED" }) } });
  const orchestrator = createProductInstallerOrchestrator({ components });
  const result = await orchestrator.install(input(root));
  assert.equal(result.ok, false);
  assert.equal(result.state, "FAILED");
  const bytes = await readFile(path.join(root, "storage", "installer", "transaction.json"), "utf8");
  assert.doesNotMatch(bytes, new RegExp(secret));
  assert.equal(JSON.parse(bytes).lastError.code, "installation.health.failed");
  assert.equal((await orchestrator.resume(input(root))).state, "FAILED");
});

test("C047 preserves Site, credential, public, database and active-Core sentinels on failure", async () => {
  const root = await workspace();
  const sentinels = ["sites/site.json", "config/credentials.json", "public/index.html", "storage/site.db", "core/active-sentinel"];
  for (const relative of sentinels) { await mkdir(path.dirname(path.join(root, relative)), { recursive: true }); await writeFile(path.join(root, relative), `sentinel:${relative}\n`); }
  const before = await Promise.all(sentinels.map((relative) => readFile(path.join(root, relative), "utf8")));
  const { components } = fixture({ systemd: { install: async () => { const error = new Error("service rejected"); error.code = "installation.systemd.failed"; throw error; } } });
  const result = await createProductInstallerOrchestrator({ components }).install(input(root));
  assert.equal(result.state, "FAILED");
  assert.deepEqual(await Promise.all(sentinels.map((relative) => readFile(path.join(root, relative), "utf8"))), before);
});

test("C047 keeps Installation workspaces and transaction ownership isolated", async () => {
  const first = await workspace();
  const second = await workspace();
  const one = fixture();
  const two = fixture();
  const [a, b] = await Promise.all([
    createProductInstallerOrchestrator({ components: one.components }).install(input(first)),
    createProductInstallerOrchestrator({ components: two.components }).install(input(second, { installationId: "staging", ownerId: "installer-2", transactionId: "install-staging-1" }))
  ]);
  assert.equal(a.state, "COMPLETED");
  assert.equal(b.state, "COMPLETED");
  assert.equal(JSON.parse(await readFile(path.join(first, "storage", "installer", "transaction.json"))).installationId, "production");
  assert.equal(JSON.parse(await readFile(path.join(second, "storage", "installer", "transaction.json"))).installationId, "staging");
});

function pathTo(state) {
  const states = ["PREFLIGHTED", "DOWNLOADING", "VERIFIED", "EXTRACTING", "BOOTSTRAPPING", "CONFIGURING", "SERVICE_INSTALLING", "HEALTH_CHECK"];
  return states.slice(0, states.indexOf(state) + 1);
}
