import assert from "node:assert/strict";
import test from "node:test";
import createSiteMetadata, {
  SITE_METADATA_REQUIRED_FIELDS,
  SITE_METADATA_VERSION,
  SITE_STATUSES,
  SiteState,
  validateSiteMetadata
} from "../framework/src/site/createSiteMetadata.js";

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
  assert.deepEqual(Object.keys(metadata), [
    "created_at",
    "framework_version",
    "metadata_version",
    "name",
    "status",
    "updated_at",
    "uuid"
  ]);
  assert.equal(metadata.name, "tinsinhphat");
  assert.equal(metadata.status, SiteState.SETUP_REQUIRED);
  assert.equal(metadata.uuid, "8d20de63-68f1-43cf-a28f-f62a347695a1");
  assert.equal(metadata.framework_version, "1.0.0");
  assert.equal(validateSiteMetadata(metadata).ok, true);
});

test("validateSiteMetadata validates required metadata schema", () => {
  const result = validateSiteMetadata({
    name: "",
    status: "BAD",
    uuid: "not-a-uuid"
  });

  assert.deepEqual(SITE_METADATA_REQUIRED_FIELDS, [
    "uuid",
    "name",
    "status",
    "framework_version",
    "created_at",
    "updated_at"
  ]);
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "site.metadata.field.required",
      "site.metadata.field.required",
      "site.metadata.field.required",
      "site.metadata.field.required",
      "site.metadata.uuid.invalid",
      "site.metadata.status.invalid"
    ]
  );
});

test("createSiteMetadata exposes the architecture v2 state list", () => {
  assert.deepEqual(SITE_STATUSES, [
    SiteState.CREATED,
    SiteState.SETUP_REQUIRED,
    SiteState.READY_FOR_FIRST_BUILD,
    SiteState.BUILDING,
    SiteState.RUNNING,
    SiteState.ERROR,
    SiteState.MAINTENANCE
  ]);
});

test("createSiteMetadata falls back invalid status to ERROR", () => {
  const metadata = createSiteMetadata({
    status: "unknown",
    uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1"
  });

  assert.equal(metadata.status, "ERROR");
});
