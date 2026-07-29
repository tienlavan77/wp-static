import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createWebhookRegistrationController from "../src/runtime/createWebhookRegistrationController.js";
import createSiteMetadata from "../src/site/createSiteMetadata.js";
import createSiteRepository from "../src/site/createSiteRepository.js";

test("Runtime registers webhook with provisioned UUID and managed secret", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-webhook-runtime-"));
  const repository = createSiteRepository({ workspaceDir });
  try {
    await repository.writeMetadata("company-a", createSiteMetadata({ name: "Company A", uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1" }));
    const calls = [];
    const controller = createWebhookRegistrationController({
      repository,
      webhookActivationService: { activate: async (input) => { calls.push(input); return { diagnostics: { errors: [], warnings: [] }, metadata: { webhookId: "source-hook-1", webhookStatus: "verified" }, ok: true }; } },
      webhookBaseUrl: "https://example.test/webhook"
    });
    const result = await controller.register("company-a");
    assert.equal(result.ok, true);
    assert.equal(calls[0].siteId, "company-a");
    assert.equal(calls[0].webhookUrl, "https://example.test/webhook/8d20de63-68f1-43cf-a28f-f62a347695a1");
    assert.equal(typeof calls[0].adapterOptions.webhookSecret, "string");
    const config = JSON.parse(await readFile(result.configurationPath, "utf8"));
    assert.equal(config.uuid, "8d20de63-68f1-43cf-a28f-f62a347695a1");
    assert.equal(config.webhookId, "source-hook-1");
    assert.ok(config.secret.length >= 32);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Runtime persists a pending webhook secret before WordPress verifies its callback", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-webhook-pending-"));
  const repository = createSiteRepository({ workspaceDir });
  try {
    await repository.writeMetadata("company-a", createSiteMetadata({ name: "Company A", uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1" }));
    const controller = createWebhookRegistrationController({
      repository,
      webhookActivationService: { activate: async () => ({ diagnostics: { errors: [{ code: "webhook.verify.failed", message: "callback failed", severity: "error" }], warnings: [] }, ok: false }) },
      webhookBaseUrl: "https://example.test/webhook"
    });
    const result = await controller.register("company-a");
    assert.equal(result.ok, false);
    const configPath = path.join(repository.resolveSiteRoot("company-a"), "config", "webhook.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    assert.equal(config.webhookStatus, "pending");
    assert.ok(config.secret.length >= 32);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
