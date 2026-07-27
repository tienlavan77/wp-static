import assert from "node:assert/strict";
import test from "node:test";
import createSiteMetadata from "../src/site/createSiteMetadata.js";
import createSiteStateManager, {
  SITE_STATE_TRANSITIONS
} from "../src/site/createSiteStateManager.js";

test("createSiteStateManager exposes architecture v2 transitions", () => {
  assert.deepEqual(SITE_STATE_TRANSITIONS.CREATED, ["SETUP_REQUIRED", "DISABLED"]);
  assert.deepEqual(SITE_STATE_TRANSITIONS.SETUP_REQUIRED, [
    "REGISTERING_SOURCE",
    "ERROR",
    "DISABLED"
  ]);
  assert.deepEqual(SITE_STATE_TRANSITIONS.REGISTERING_SOURCE, [
    "READY",
    "ERROR",
    "DISABLED"
  ]);
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

  const result = manager.transition(metadata, "REGISTERING_SOURCE", {
    now: "2026-07-27T01:00:00.000Z",
    reason: "setup-source-registration"
  });

  assert.equal(result.ok, true);
  assert.equal(result.metadata.status, "REGISTERING_SOURCE");
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
