import assert from "node:assert/strict";
import test from "node:test";
import createSiteMetadata, {
  SITE_METADATA_VERSION,
  SITE_STATUSES
} from "../src/site/createSiteMetadata.js";

test("createSiteMetadata creates architecture v2 site metadata", () => {
  const metadata = createSiteMetadata({
    createdAt: "2026-07-27T00:00:00.000Z",
    frameworkVersion: "1.0.0",
    name: "tinsinhphat",
    status: "SETUP_REQUIRED",
    updatedAt: "2026-07-27T00:00:00.000Z",
    uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1"
  });

  assert.equal(metadata.metadata_version, SITE_METADATA_VERSION);
  assert.equal(metadata.name, "tinsinhphat");
  assert.equal(metadata.status, "SETUP_REQUIRED");
  assert.equal(metadata.uuid, "8d20de63-68f1-43cf-a28f-f62a347695a1");
  assert.equal(metadata.framework_version, "1.0.0");
});

test("createSiteMetadata exposes the architecture v2 state list", () => {
  assert.deepEqual(SITE_STATUSES, [
    "CREATED",
    "SETUP_REQUIRED",
    "REGISTERING_SOURCE",
    "READY",
    "BUILDING",
    "RUNNING",
    "ERROR",
    "DISABLED"
  ]);
});

test("createSiteMetadata falls back invalid status to ERROR", () => {
  const metadata = createSiteMetadata({
    status: "unknown",
    uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1"
  });

  assert.equal(metadata.status, "ERROR");
});
