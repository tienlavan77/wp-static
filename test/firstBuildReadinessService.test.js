import assert from "node:assert/strict";
import test from "node:test";
import createFirstBuildReadinessService from "../framework/src/setup/createFirstBuildReadinessService.js";
import createSetupService, { SetupClient } from "../framework/src/setup/createSetupService.js";
import { SetupState } from "../framework/src/setup/createSetupStateMachine.js";

function metadata(extra = {}) {
  return { adapterVersion: "1.0", capabilities: [], endpoint: "https://source.example", schema: "source-metadata", schemaVersion: 1, sourceType: "rest", ...extra };
}

test("first build readiness validates persisted source metadata and leaves webhook optional", async () => {
  const readiness = createFirstBuildReadinessService({ repository: { readSourceMetadata: async () => metadata() } });
  assert.equal((await readiness.validate("company-a")).ok, true);
  const failed = await createFirstBuildReadinessService({ repository: { readSourceMetadata: async () => metadata({ webhookStatus: "removed" }) } }).validate("company-a");
  assert.equal(failed.ok, false);
});

test("Setup Service emits readiness only after final validation", async () => {
  const service = createSetupService({
    createSessionId: () => "ready-session",
    firstBuildReadinessService: { validate: async () => ({ diagnostics: { errors: [], warnings: [] }, metadata: metadata(), ok: true }) },
    now: () => "2026-07-28T00:00:00.000Z"
  });
  const started = service.start({ client: SetupClient.CLI, siteId: "company-a" });
  service.advance(started.session.id);
  service.advance(started.session.id);
  service.advance(started.session.id);
  const result = await service.readyForFirstBuild(started.session.id);
  assert.equal(result.ok, true);
  assert.equal(result.state.currentStateId, SetupState.READY_FOR_FIRST_BUILD);
  assert.deepEqual(result.events.map((event) => event.type), ["setup.state.changed", "setup.readyForFirstBuild"]);
});
