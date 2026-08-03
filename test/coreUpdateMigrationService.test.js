import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createCoreUpdateMigrationService from "../framework/src/product/update/createCoreUpdateMigrationService.js";

async function scenario({ migration = { ok: true, checkpoints: [{ id: "001", state: "completed" }] }, configuration = { ok: true } } = {}) {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "wpsc-migrate-update-")); await writeFile(path.join(workspace, "active"), "releases/1.0.0");
  const service = createCoreUpdateMigrationService({ configuration: { validate: async () => configuration }, migrations: { run: async () => migration }, staging: { inspect: async () => ({ ok: true, staged: true }) } });
  return { service, workspace };
}

test("C034 migrates and validates a staged release successfully", async () => { const { service, workspace } = await scenario(); try { const result = await service.validate({ fromVersion: "1.0.0", version: "1.1.0" }); assert.equal(result.ok, true); assert.equal(result.migrated.checkpoints[0].state, "completed"); } finally { await rm(workspace, { force: true, recursive: true }); } });
test("C034 preserves active Core on migration failure and exposes checkpoint", async () => { const { service, workspace } = await scenario({ migration: { diagnostics: { errors: [{ message: "checkpoint failed" }] }, ok: false, state: { failed: { id: "001" } } } }); try { const result = await service.validate({ fromVersion: "1.0.0", version: "1.1.0" }); assert.equal(result.ok, false); assert.equal(result.diagnostics.errors[0].code, "core_update.migration.failed"); assert.equal(await readFile(path.join(workspace, "active"), "utf8"), "releases/1.0.0"); } finally { await rm(workspace, { force: true, recursive: true }); } });
test("C034 preserves active Core on configuration validation failure and supports retry result", async () => { const { service, workspace } = await scenario({ configuration: { ok: false, diagnostics: { errors: [{ message: "invalid config" }] } } }); try { const result = await service.validate({ fromVersion: "1.0.0", version: "1.1.0" }); assert.equal(result.ok, false); assert.equal(result.diagnostics.errors[0].code, "core_update.configuration.invalid"); assert.equal(await readFile(path.join(workspace, "active"), "utf8"), "releases/1.0.0"); } finally { await rm(workspace, { force: true, recursive: true }); } });

test("C034 resumes a failed migration checkpoint on a later validation attempt", async () => { let fail = true; const workspace = await mkdtemp(path.join(os.tmpdir(), "wpsc-migrate-resume-")); try { await writeFile(path.join(workspace, "active"), "releases/1.0.0"); const service = createCoreUpdateMigrationService({ configuration: { validate: async () => ({ ok: true }) }, migrations: { run: async () => fail ? { ok: false, state: { failed: { id: "001" } } } : { checkpoints: [{ id: "001", state: "skipped" }, { id: "002", state: "completed" }], ok: true } }, staging: { inspect: async () => ({ ok: true }) } }); assert.equal((await service.validate({ fromVersion: "1.0.0", version: "1.1.0" })).ok, false); fail = false; const resumed = await service.validate({ fromVersion: "1.0.0", version: "1.1.0" }); assert.equal(resumed.ok, true); assert.equal(resumed.migrated.checkpoints[1].state, "completed"); assert.equal(await readFile(path.join(workspace, "active"), "utf8"), "releases/1.0.0"); } finally { await rm(workspace, { force: true, recursive: true }); } });
