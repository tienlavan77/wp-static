import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createCoreUpdatePlanner from "../framework/src/product/update/createCoreUpdatePlanner.js";

test("Core Update Planner creates a dry-run plan without filesystem mutation", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "wpsc-update-plan-"));
  try {
    const before = await readdir(workspace);
    const planner = createCoreUpdatePlanner({ configurationValidator: { validate: async () => ({ ok: true }) }, migrationService: { plan: async () => ({ ok: true, plan: { migrations: [{ id: "001" }] } }) }, packageVerifier: { verify: async () => ({ ok: true }) }, releaseService: { check: async () => ({ available: { packageId: "wpsc-1.1.0", version: "1.1.0" }, currentVersion: "1.0.0", ok: true }) } });
    const result = await planner.plan();
    assert.equal(result.ok, true);
    assert.equal(result.plan.package.verified, true);
    assert.deepEqual(await readdir(workspace), before);
  } finally { await rm(workspace, { force: true, recursive: true }); }
});

test("Core Update Planner rejects an unverified package before planning mutation", async () => {
  const planner = createCoreUpdatePlanner({ configurationValidator: { validate: async () => ({ ok: true }) }, migrationService: { plan: async () => ({ ok: true, plan: { migrations: [] } }) }, packageVerifier: { verify: async () => ({ ok: false }) }, releaseService: { check: async () => ({ available: { version: "1.1.0" }, currentVersion: "1.0.0", ok: true }) } });
  assert.equal((await planner.plan()).diagnostics.errors[0].code, "core_update.plan.package.unverified");
});

test("Core Update Planner returns the same plan for identical verified inputs", async () => {
  const planner = createCoreUpdatePlanner({ configurationValidator: { validate: async () => ({ ok: true }) }, migrationService: { plan: async () => ({ ok: true, plan: { migrations: [{ id: "001" }, { id: "002" }] } }) }, packageVerifier: { verify: async () => ({ ok: true }) }, releaseService: { check: async () => ({ available: { packageId: "wpsc-1.2.0", version: "1.2.0" }, currentVersion: "1.0.0", ok: true }) } });
  const first = await planner.plan();
  const second = await planner.plan();
  assert.deepEqual(second, first);
  assert.equal(JSON.stringify(second.plan), JSON.stringify(first.plan));
});
