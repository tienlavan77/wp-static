import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createProvisioningService from "../framework/src/provision/createProvisioningService.js";
import createSiteRuntimeInstance from "../framework/src/runtime/bootstrap/createSiteRuntimeInstance.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

function adapter() {
  return {
    getMetadata: async () => ({ adapterVersion: "1.0", capabilities: ["supportsWebhook"], sourceType: "rest" }),
    healthCheck: async () => ({ ok: true }),
    initialize: async () => ({ ok: true }),
    registerWebhook: async () => ({ ok: true, webhookId: "webhook-e2e-1" }),
    unregisterWebhook: async () => ({ ok: true }),
    validate: async () => ({ ok: true }),
    verifyWebhook: async () => ({ ok: true })
  };
}

test("Runtime E2E provisions, resolves a domain, configures, and publishes a running Site", { timeout: 20_000 }, async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-runtime-e2e-"));
  const repository = createSiteRepository({ workspaceDir });
  const provision = createProvisioningService({ repository });
  const created = await provision.createSite({ name: "Company A", uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1" });
  assert.equal(created.ok, true);

  const instance = createSiteRuntimeInstance({
    adapterLoader: { load: () => adapter() },
    contentReader: {
      read: async () => ({
        assets: [],
        collections: {},
        items: [{
          data: { content: "<p>Company A is running.</p>" },
          domain: "test",
          id: "welcome-1",
          slug: "welcome",
          title: "Welcome to Company A",
          type: "page"
        }]
      })
    },
    domains: { "example.test": created.siteId },
    repository,
    webhookBaseUrl: "https://example.test/webhook"
  });

  try {
    const request = (input = {}) => instance.router.handle({ host: "example.test", ...input });
    const installer = await request();
    assert.equal(installer.status, 200);
    assert.match(installer.headers["content-type"], /text\/html/);
    assert.match(installer.body, /Set up company-a/);

    const started = await request({ method: "POST", path: "/installer/start" });
    const sessionId = started.body.session.id;
    const completed = await request({ body: { configuration: { locale: "vi-VN", siteName: "Company A" }, sessionId }, method: "POST", path: "/installer/complete" });
    assert.equal(completed.status, 200);

    const sourceInput = { source: { endpoint: "https://source.example.test", type: "rest" } };
    const sourceCheck = await request({ body: sourceInput, method: "POST", path: "/dashboard/source/test" });
    assert.equal(sourceCheck.status, 200);
    const source = await request({ body: sourceInput, method: "POST", path: "/dashboard/source/register" });
    assert.equal(source.status, 200);
    const webhook = await request({ body: {}, method: "POST", path: "/dashboard/webhook/register" });
    assert.equal(webhook.status, 200);

    instance.services.scheduler.start();
    const build = await request({ body: {}, method: "POST", path: "/dashboard/build" });
    assert.equal(build.status, 200, JSON.stringify(build.body.diagnostics));
    assert.equal(build.body.metadata.status, "RUNNING");

    const metadata = await repository.readMetadata(created.siteId);
    const sourceMetadata = await repository.readSourceMetadata(created.siteId);
    const webhookConfig = JSON.parse(await readFile(path.join(repository.resolveSiteRoot(created.siteId), "config", "webhook.json"), "utf8"));
    const buildConfig = JSON.parse(await readFile(path.join(repository.resolveSiteRoot(created.siteId), "config", "build.json"), "utf8"));
    assert.equal(metadata.status, "RUNNING");
    assert.equal(sourceMetadata.webhookStatus, "verified");
    assert.equal(webhookConfig.uuid, metadata.uuid);
    assert.equal(typeof webhookConfig.secret, "string");
    assert.equal(buildConfig.status, "SUCCESS");

    const website = await readFile(path.join(repository.resolveSiteRoot(created.siteId), "public", "dist", "welcome", "index.html"), "utf8");
    assert.match(website, /Welcome to Company A/);
  } finally {
    await rm(workspaceDir, { force: true, recursive: true });
  }
});
