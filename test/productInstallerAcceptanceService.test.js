import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createProductInstallerAcceptanceService, { createProtectedStateSnapshot } from "../framework/src/product/installer/createProductInstallerAcceptanceService.js";

async function fixture() {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "wpsc-c048-"));
  const sentinels = { "config/runtime.env": "SECRET=value", "public/index.html": "public", "sites/shop/config/site.json": "site", "sites/shop/credentials/source.json": "credential", "storage/data.db": "database" };
  for (const [relative, value] of Object.entries(sentinels)) { await mkdir(path.dirname(path.join(workspace, relative)), { recursive: true }); await writeFile(path.join(workspace, relative), value); }
  const calls = [];
  const maintenance = { run: async (input) => { calls.push(`maintenance:${input.mode}:${input.dryRun === true}`); return { mode: input.mode, ok: true }; } };
  const installer = { install: async () => { calls.push("installer"); await mkdir(path.join(workspace, "core", "releases", "1.0.0"), { recursive: true }); return { ok: true, state: "COMPLETED", transaction: { transactionId: "install-production" } }; } };
  const health = { inspect: async () => { calls.push("health"); return { reportPath: path.join(workspace, "health.md"), state: "HEALTHY" }; } };
  const probes = Object.fromEntries(["global-command", "systemd", "runtime", "nginx"].map((name) => [name, async () => { calls.push(`probe:${name}`); return { ok: true, secretToken: "must-redact", status: name === "runtime" ? 200 : "active" }; }]));
  return { calls, health, installer, maintenance, probes, sentinels, workspace };
}

test("C048 records complete real-acceptance evidence only after Installation health and infrastructure probes pass", async () => {
  const value = await fixture();
  const service = createProductInstallerAcceptanceService({ ...value, snapshot: createProtectedStateSnapshot({ workspace: value.workspace }) });
  const result = await service.run({ confirmed: true, installationId: "production", ownerId: "vps-installer" });
  assert.equal(result.status, "PASS");
  assert.deepEqual(value.calls, ["maintenance:REINSTALL:true", "installer", "health", "probe:global-command", "probe:systemd", "probe:runtime", "probe:nginx", "maintenance:VERIFY:false"]);
  const evidence = JSON.parse(await readFile(result.evidencePath, "utf8"));
  assert.equal(evidence.schema, "wpsc.c048-vps-acceptance");
  assert.equal(evidence.installation.state, "COMPLETED");
  assert.equal(evidence.health.state, "HEALTHY");
  assert.equal(evidence.probes.runtime.secretToken, "[REDACTED]");
  assert.deepEqual(evidence.baseline, evidence.after);
});

test("C048 refuses mutation without explicit root-runner confirmation", async () => {
  const value = await fixture();
  const result = await createProductInstallerAcceptanceService({ ...value, snapshot: createProtectedStateSnapshot({ workspace: value.workspace }) }).run({ installationId: "production" });
  assert.equal(result.ok, false);
  assert.equal(result.diagnostics.errors[0].code, "installation.acceptance.confirmation_required");
  assert.deepEqual(value.calls, []);
});

test("C048 rejects unhealthy Runtime and missing mandatory VPS probes", async () => {
  const unhealthy = await fixture();
  unhealthy.health.inspect = async () => ({ state: "FAILED" });
  await assert.rejects(createProductInstallerAcceptanceService({ ...unhealthy, snapshot: createProtectedStateSnapshot({ workspace: unhealthy.workspace }) }).run({ confirmed: true, installationId: "production" }), /health is FAILED/);
  const missing = await fixture();
  delete missing.probes.nginx;
  await assert.rejects(createProductInstallerAcceptanceService({ ...missing, snapshot: createProtectedStateSnapshot({ workspace: missing.workspace }) }).run({ confirmed: true, installationId: "production" }), /probe nginx is missing/);
});

test("C048 production mode rejects placeholder probes that only return ok true", async () => {
  const value = await fixture();
  const service = createProductInstallerAcceptanceService({ ...value, requireRealProbes: true, snapshot: createProtectedStateSnapshot({ workspace: value.workspace }) });
  await assert.rejects(service.run({ confirmed: true, installationId: "production" }), /not a real production probe/);
});

test("C048 requires a deterministic SHA-256 database fingerprint when configured", async () => {
  const value = await fixture();
  const snapshot = createProtectedStateSnapshot({ databaseFingerprint: async () => "not-a-digest", workspace: value.workspace });
  await assert.rejects(snapshot(), /Database fingerprint must be a lowercase SHA-256 digest/);
});

test("C048 blocks PASS when Site, credential, public or database state changes", async () => {
  for (const relative of ["sites/shop/config/site.json", "sites/shop/credentials/source.json", "public/index.html", "storage/data.db"]) {
    const value = await fixture();
    value.installer.install = async () => { await writeFile(path.join(value.workspace, relative), "changed"); return { ok: true, state: "COMPLETED", transaction: {} }; };
    const service = createProductInstallerAcceptanceService({ ...value, snapshot: createProtectedStateSnapshot({ workspace: value.workspace }) });
    await assert.rejects(service.run({ confirmed: true, installationId: "production" }), /Protected .* changed/);
  }
});
