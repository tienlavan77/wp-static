import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { CoreUpdateState } from "../framework/src/product/update/coreUpdateContract.js";
import createCoreUpdateService from "../framework/src/product/update/createCoreUpdateService.js";

async function workspace() { return mkdtemp(path.join(os.tmpdir(), "wpsc-core-update-")); }

test("Core Update persists a deterministic lifecycle and can resume after restart", async () => {
  const workspaceDir = await workspace();
  const options = { createId: () => "update-1", now: () => "2026-08-03T00:00:00.000Z", workspaceDir };
  try {
    const service = createCoreUpdateService(options);
    assert.equal((await service.start({ plan: { targetVersion: "1.1.0" } })).update.state, CoreUpdateState.CHECKING);
    assert.equal((await service.transition({ state: CoreUpdateState.PLANNED })).update.state, CoreUpdateState.PLANNED);
    const restarted = createCoreUpdateService(options);
    const resumed = await restarted.resume();
    assert.equal(resumed.resumable, true);
    assert.equal(resumed.nextAction, "download-package");
    assert.equal(resumed.recoveryRequired, false);
    assert.equal(resumed.update.plan.targetVersion, "1.1.0");
    assert.equal(resumed.update.checkpoints.length, 2);
    const persisted = JSON.parse(await readFile(path.join(workspaceDir, "storage", "updates", "core-update.json"), "utf8"));
    assert.equal(persisted.state, CoreUpdateState.PLANNED);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Core Update rejects invalid transitions and records a recoverable failure path", async () => {
  const workspaceDir = await workspace();
  try {
    const service = createCoreUpdateService({ createId: () => "update-2", workspaceDir });
    await service.start();
    const invalid = await service.transition({ state: CoreUpdateState.ACTIVATING });
    assert.equal(invalid.ok, false);
    assert.equal(invalid.diagnostics.errors[0].code, "core_update.transition.invalid");
    assert.equal((await service.transition({ error: "signature rejected", state: CoreUpdateState.FAILED })).update.lastError, "signature rejected");
    assert.equal((await service.transition({ state: CoreUpdateState.ROLLBACK })).update.state, CoreUpdateState.ROLLBACK);
    assert.equal((await service.transition({ state: CoreUpdateState.ROLLED_BACK })).update.state, CoreUpdateState.ROLLED_BACK);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Core Update accepts every deterministic pre-activation lifecycle transition", async () => {
  const workspaceDir = await workspace();
  try {
    const service = createCoreUpdateService({ createId: () => "update-3", workspaceDir });
    await service.start();
    for (const state of [
      CoreUpdateState.PLANNED, CoreUpdateState.DOWNLOADING, CoreUpdateState.VERIFIED,
      CoreUpdateState.BACKING_UP, CoreUpdateState.STAGING, CoreUpdateState.MIGRATING,
      CoreUpdateState.VALIDATING, CoreUpdateState.ACTIVATING, CoreUpdateState.HEALTH_CHECK,
      CoreUpdateState.COMPLETED
    ]) assert.equal((await service.transition({ state })).update.state, state);
    assert.equal((await service.resume()).resumable, false);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Core Update ignores caller-supplied stale state and keeps a semantic bounded history", async () => {
  const workspaceDir = await workspace();
  try {
    const service = createCoreUpdateService({ createId: () => "update-4", historyLimit: 2, workspaceDir });
    await service.start();
    await service.transition({ reason: "release-selected", state: CoreUpdateState.PLANNED });
    const stale = await service.transition({ from: { state: CoreUpdateState.CHECKING }, state: CoreUpdateState.PLANNED });
    assert.equal(stale.ok, false);
    const update = (await service.status()).update;
    assert.equal(update.state, CoreUpdateState.PLANNED);
    assert.equal(update.history.length, 2);
    assert.equal(update.history[1].event, "state.transition");
    assert.equal(update.history[1].reason, "release-selected");
    assert.equal(update.history[1].revision, update.revision);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Core Update serializes concurrent lifecycle writes across service instances", async () => {
  const workspaceDir = await workspace();
  try {
    const first = createCoreUpdateService({ createId: () => "update-5", workspaceDir });
    const second = createCoreUpdateService({ workspaceDir });
    await first.start();
    const [left, right] = await Promise.all([
      first.transition({ state: CoreUpdateState.PLANNED }),
      second.transition({ state: CoreUpdateState.PLANNED })
    ]);
    assert.equal([left.ok, right.ok].filter(Boolean).length, 1);
    assert.equal((await first.status()).update.state, CoreUpdateState.PLANNED);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
