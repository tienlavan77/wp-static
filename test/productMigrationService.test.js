import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createProductMigrationService from "../framework/src/product/createProductMigrationService.js";

test("Product Migration plans ordered migrations, dry-runs and applies idempotently", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-migration-"));
  try {
    let calls = 0;
    const service = createProductMigrationService({ workspaceDir, migrations: [
      { id: "add-profile", fromVersion: "1.0.0", toVersion: "1.1.0", migrate: ({ configuration }) => { calls += 1; return { configuration: { ...configuration, profile: "personal" } }; } },
      { id: "add-schema", fromVersion: "1.1.0", toVersion: "1.2.0", migrate: ({ configuration }) => { calls += 1; return { configuration: { ...configuration, schemaFlag: true } }; } }
    ] });
    assert.equal((await service.run({ dryRun: true, fromVersion: "1.0.0", toVersion: "1.2.0" })).plan.migrations.length, 2);
    assert.equal(calls, 0);
    assert.equal((await service.run({ fromVersion: "1.0.0", toVersion: "1.2.0" })).ok, true);
    assert.equal(calls, 2);
    assert.equal((await service.run({ fromVersion: "1.0.0", toVersion: "1.2.0" })).checkpoints.every((checkpoint) => checkpoint.state === "skipped"), true);
    assert.equal(calls, 2);
    assert.deepEqual(JSON.parse(await readFile(path.join(workspaceDir, "config", "wpsc.json"), "utf8")), { profile: "personal", schemaFlag: true });
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Product Migration persists a failure checkpoint for retry", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-migration-failure-"));
  try {
    let fail = true;
    const service = createProductMigrationService({ workspaceDir, migrations: [{ id: "retry", fromVersion: "1.0.0", toVersion: "1.1.0", migrate: () => { if (fail) throw new Error("checkpoint"); return {}; } }] });
    assert.equal((await service.run({ fromVersion: "1.0.0", toVersion: "1.1.0" })).ok, false);
    assert.equal((await service.status()).state.failed.id, "retry");
    fail = false;
    assert.equal((await service.run({ fromVersion: "1.0.0", toVersion: "1.1.0" })).ok, true);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
