import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { mkdtemp } from "node:fs/promises";
import createSiteConfigurationService from "../framework/src/site/createSiteConfigurationService.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

test("Site Configuration Service persists isolated settings per Site", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-site-settings-"));
  const repository = createSiteRepository({ workspaceDir });
  const service = createSiteConfigurationService({ repository });

  const saved = await service.save("site-a", { general: { locale: "vi", timezone: "Asia/Ho_Chi_Minh" }, theme: { name: "storefront" } });
  assert.equal(saved.ok, true);
  assert.equal(saved.settings.siteId, "site-a");
  assert.equal(saved.settings.general.locale, "vi");
  assert.equal(saved.settings.theme.name, "storefront");
  assert.equal(Object.isFrozen(saved.settings), true);

  const siteB = await service.get("site-b");
  assert.equal(siteB.ok, true);
  assert.equal(siteB.settings.siteId, "site-b");
  assert.equal(siteB.settings.general.locale, "en");
});

test("Site Configuration Service rejects malformed settings", async () => {
  const repository = { readSettings: async () => ({ schema: "bad" }), writeSettings: async () => ({}) };
  const service = createSiteConfigurationService({ repository });
  const result = await service.get("site-a");
  assert.equal(result.ok, false);
  assert.equal(result.diagnostics.errors[0].code, "site.settings.schema.invalid");
});
