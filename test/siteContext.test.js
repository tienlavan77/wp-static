import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createSiteContext from "../framework/src/site/createSiteContext.js";
import createSiteConfigurationService from "../framework/src/site/createSiteConfigurationService.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";
import createSourceCredentialStore from "../framework/src/runtime/source/createSourceCredentialStore.js";
import createSiteRuntimeInstance from "../framework/src/runtime/bootstrap/createSiteRuntimeInstance.js";
import { createSiteRuntimeSkeleton } from "../framework/src/runtime/bootstrap/createSiteRuntime.js";

test("Site Context is explicit, immutable, and rejects cross-Site operations", () => {
  const siteA = createSiteContext({ domain: "a.example.test", siteId: "site-a", workspaceId: "workspace-1" });
  const siteB = createSiteContext({ domain: "b.example.test", siteId: "site-b", workspaceId: "workspace-1" });

  assert.equal(siteA.schema, "wpsc.site-context");
  assert.equal(siteA.siteId, "site-a");
  assert.equal(siteA.assertSite("site-a"), "site-a");
  assert.throws(() => siteA.assertSite("site-b"), /Site context mismatch/);
  assert.notEqual(siteA.siteId, siteB.siteId);
  assert.equal(Object.isFrozen(siteA), true);
});

test("Two Sites share repository infrastructure while keeping settings and credentials isolated", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-multisite-"));
  const repository = createSiteRepository({ workspaceDir });
  const settings = createSiteConfigurationService({ repository });
  const credentials = createSourceCredentialStore({ repository });

  try {
    await settings.save("site-a", { general: { locale: "vi" } });
    await settings.save("site-b", { general: { locale: "en" } });
    await credentials.write("site-a", { wordpressUsername: "editor-a", applicationPassword: "secret-a" });
    await credentials.write("site-b", { wordpressUsername: "editor-b", applicationPassword: "secret-b" });

    assert.equal((await settings.get("site-a")).settings.general.locale, "vi");
    assert.equal((await settings.get("site-b")).settings.general.locale, "en");
    assert.equal((await credentials.read("site-a")).wordpressUsername, "editor-a");
    assert.equal((await credentials.read("site-b")).wordpressUsername, "editor-b");
    assert.notEqual(repository.resolveSiteRoot("site-a"), repository.resolveSiteRoot("site-b"));
    assert.match(await readFile(repository.resolveSettingsPath("site-a"), "utf8"), /"siteId": "site-a"/);
    assert.match(await readFile(repository.resolveSettingsPath("site-b"), "utf8"), /"siteId": "site-b"/);
  } finally {
    await rm(workspaceDir, { force: true, recursive: true });
  }
});

test("Two Sites coexist in one Runtime and resolve independently by domain", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-multisite-runtime-"));
  const repository = createSiteRepository({ workspaceDir });
  const sourceAdapter = {
    getMetadata: async () => ({ adapterVersion: "1", capabilities: [], sourceType: "wordpress" }),
    healthCheck: async () => ({ ok: true }),
    initialize: async () => ({ ok: true }),
    registerWebhook: async () => ({ ok: true, webhookId: "hook-1" }),
    unregisterWebhook: async () => ({ ok: true }),
    validate: async () => ({ ok: true }),
    verifyWebhook: async () => ({ ok: true })
  };

  try {
    await createSiteRuntimeSkeleton({ repository, siteId: "site-a" });
    await createSiteRuntimeSkeleton({ repository, siteId: "site-b" });
    const runtime = createSiteRuntimeInstance({
      adapterLoader: { load: () => sourceAdapter },
      contentReader: { read: async () => ({ assets: [], collections: {}, items: [] }) },
      domains: { "a.example.test": "site-a", "b.example.test": "site-b" },
      repository,
      webhookBaseUrl: "https://runtime.example.test/webhook"
    });
    const siteA = await runtime.router.handle({ host: "a.example.test", method: "GET", path: "/" });
    const siteB = await runtime.router.handle({ host: "b.example.test", method: "GET", path: "/" });

    assert.match(siteA.body, /Set up site-a/);
    assert.match(siteB.body, /Set up site-b/);
    assert.doesNotMatch(siteA.body, /Set up site-b/);
    assert.doesNotMatch(siteB.body, /Set up site-a/);
  } finally {
    await rm(workspaceDir, { force: true, recursive: true });
  }
});
