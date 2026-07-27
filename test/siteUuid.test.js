import assert from "node:assert/strict";
import test from "node:test";
import createSiteUuid, {
  isSiteUuid,
  SITE_UUID_VERSION
} from "../src/site/createSiteUuid.js";

test("createSiteUuid creates or validates architecture v2 UUIDs", () => {
  const uuid = createSiteUuid({
    uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1"
  });

  assert.equal(SITE_UUID_VERSION, "1.0");
  assert.equal(uuid, "8d20de63-68f1-43cf-a28f-f62a347695a1");
  assert.equal(isSiteUuid(uuid), true);
});

test("createSiteUuid rejects invalid UUIDs", () => {
  assert.equal(isSiteUuid("not-a-uuid"), false);
  assert.throws(
    () => createSiteUuid({
      uuid: "not-a-uuid"
    }),
    /Invalid site uuid/
  );
});
