import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import createSitePathPolicy from "../framework/src/site/createSitePathPolicy.js";

test("createSitePathPolicy resolves paths inside one site root", () => {
  const policy = createSitePathPolicy({
    siteRoot: "/workspace/sites/tinsinhphat"
  });

  assert.equal(
    policy.resolve("config", "site.json"),
    path.join("/workspace", "sites", "tinsinhphat", "config", "site.json")
  );
});

test("createSitePathPolicy rejects paths outside the site root", () => {
  const policy = createSitePathPolicy({
    siteRoot: "/workspace/sites/tinsinhphat"
  });

  assert.equal(policy.isAllowed("/workspace/sites/tinsinhphat/config/site.json"), true);
  assert.equal(policy.isAllowed("/workspace/sites/other/config/site.json"), false);
  assert.throws(
    () => policy.resolve("..", "other", "config", "site.json"),
    /outside the allowed site root/
  );
});
