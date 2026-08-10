import assert from "node:assert/strict";
import test from "node:test";
import createProductRolloutFacade from "../framework/src/product/createProductRolloutFacade.js";

test("C050 rollout dry-run delegates only to C049 check and performs no mutation", async () => {
  const calls = [];
  const facade = fixture({ check: async () => { calls.push("check"); return { ok: true, status: "UPDATE_AVAILABLE" }; }, update: async () => calls.push("update"), status: async () => calls.push("status") });
  const result = await facade.rollout({ channel: "local", dryRun: true, installationId: "local-test" });
  assert.equal(result.ok, true);
  assert.equal(result.mutation, "NONE");
  assert.deepEqual(calls, ["check"]);
});

test("C050 rollout requires confirmation after read-only availability check", async () => {
  const calls = [];
  const facade = fixture({ check: async () => { calls.push("check"); return { ok: true }; }, update: async () => calls.push("update"), status: async () => calls.push("status") });
  const result = await facade.rollout({ channel: "local", installationId: "local-test" });
  assert.equal(result.code, "CONFIRMATION_REQUIRED");
  assert.equal(result.mutation, "NONE");
  assert.deepEqual(calls, ["check"]);
});

test("C050 confirmed rollout delegates update and status to C049", async () => {
  const calls = [];
  const facade = fixture({
    check: async () => { calls.push("check"); return { ok: true }; },
    update: async () => { calls.push("update"); return { ok: true, finalVersion: "1.2.0", status: "PASS", transactionId: "release-update-local", evidence: { schema: "wpsc.c049-self-update", status: "PASS", transactionId: "release-update-local", protected: "not-returned" } }; },
    status: async () => { calls.push("status"); return { ok: true, transaction: { state: "COMPLETED", transactionId: "release-update-local" } }; }
  });
  const result = await facade.rollout({ channel: "local", confirmed: true, installationId: "local-test" });
  assert.equal(result.ok, true);
  assert.equal(result.transactionId, "release-update-local");
  assert.deepEqual(result.evidence, { schema: "wpsc.c049-self-update", status: "PASS", transactionId: "release-update-local" });
  assert.deepEqual(calls, ["check", "update", "status"]);
});

test("C050 rollout propagates C049 failures and rejects unknown identity/channel", async () => {
  const failed = fixture({ check: async () => ({ code: "c049.failed", ok: false }), update: async () => ({}), status: async () => ({}) });
  assert.equal((await failed.rollout({ channel: "local", dryRun: true, installationId: "local-test" })).code, "c049.failed");
  assert.equal((await failed.rollout({ channel: "missing", dryRun: true, installationId: "local-test" })).code, "release_operations.channel.not_found");
  assert.equal((await failed.rollout({ channel: "local", dryRun: true, installationId: "missing" })).code, "installation.not_found");
});

function fixture(releaseUpdate) {
  return createProductRolloutFacade({ configuration: { channels: { local: {} } }, registry: { read: async () => ({ installations: { "local-test": { workspace: "/tmp/local-installation" } } }) }, releaseUpdate });
}
