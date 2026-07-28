import assert from "node:assert/strict";
import test from "node:test";
import createSiteMetadata from "../src/site/createSiteMetadata.js";
import createSiteStateManager, {
  SITE_STATE_TRANSITIONS
} from "../src/site/createSiteStateManager.js";

test("createSiteStateManager exposes canonical runtime transitions", () => {
  assert.deepEqual(SITE_STATE_TRANSITIONS.CREATED, ["SETUP_REQUIRED"]);
  assert.deepEqual(SITE_STATE_TRANSITIONS.SETUP_REQUIRED, ["READY_FOR_FIRST_BUILD", "ERROR"]);
  assert.deepEqual(SITE_STATE_TRANSITIONS.READY_FOR_FIRST_BUILD, ["BUILDING", "ERROR"]);
});

test("createSiteStateManager transitions metadata safely", () => {
  const manager = createSiteStateManager();
  const metadata = createSiteMetadata({
    createdAt: "2026-07-27T00:00:00.000Z",
    name: "tinsinhphat",
    status: "SETUP_REQUIRED",
    updatedAt: "2026-07-27T00:00:00.000Z",
    uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1"
  });

  const result = manager.transition(metadata, "READY_FOR_FIRST_BUILD", {
    now: "2026-07-27T01:00:00.000Z",
    reason: "setup-source-registration"
  });

  assert.equal(result.ok, true);
  assert.equal(result.metadata.status, "READY_FOR_FIRST_BUILD");
  assert.equal(result.metadata.previous_status, "SETUP_REQUIRED");
  assert.equal(result.metadata.status_reason, "setup-source-registration");
  assert.equal(result.metadata.updated_at, "2026-07-27T01:00:00.000Z");
});

test("createSiteStateManager rejects invalid transitions without mutation", () => {
  const manager = createSiteStateManager();
  const metadata = createSiteMetadata({
    status: "CREATED",
    uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1"
  });

  const result = manager.transition(metadata, "RUNNING");

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "site.state.transition.invalid");
  assert.equal(result.metadata, metadata);
  assert.equal(metadata.status, "CREATED");
});
