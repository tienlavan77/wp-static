import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createSourceAdapterLoader from "../framework/src/source/createSourceAdapterLoader.js";
import createSourceRegistry from "../framework/src/source/createSourceRegistry.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";
import createWebhookActivationService, {
  WebhookActivationEvent
} from "../framework/src/setup/createWebhookActivationService.js";

function ok(extra = {}) {
  return { diagnostics: { errors: [], warnings: [] }, ok: true, ...extra };
}

function createAdapter(calls, overrides = {}) {
  return {
    getMetadata: async () => ({ adapterVersion: "1.0.0", capabilities: [], sourceType: "rest" }),
    healthCheck: async () => ok(),
    initialize: async () => ok(),
    registerWebhook: async () => {
      calls.register += 1;
      return ok({ webhookId: "source-webhook-1" });
    },
    unregisterWebhook: async () => {
      calls.unregister += 1;
      return ok();
    },
    validate: async () => ok(),
    verifyWebhook: async () => {
      calls.verify += 1;
      return ok();
    },
    ...overrides
  };
}

async function createFixture() {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-webhook-activation-"));
  const repository = createSiteRepository({ workspaceDir });
  await repository.writeSourceMetadata("company-a", {
    adapterVersion: "1.0.0",
    capabilities: ["webhook"],
    endpoint: "https://source.example.test",
    registeredAt: "2026-07-28T00:00:00.000Z",
    schema: "source-metadata",
    schemaVersion: 1,
    sourceType: "rest"
  });
  return { repository, workspaceDir };
}

test("Webhook Activation registers, verifies, and persists webhook metadata", async () => {
  const { repository, workspaceDir } = await createFixture();
  const calls = { register: 0, unregister: 0, verify: 0 };
  const registry = createSourceRegistry({
    adapters: [{ create: () => createAdapter(calls), type: "rest" }]
  });
  const service = createWebhookActivationService({
    adapterLoader: createSourceAdapterLoader({ registry }),
    repository
  });

  try {
    const result = await service.activate({
      registeredAt: "2026-07-28T01:00:00.000Z",
      siteId: "company-a",
      webhookUrl: "https://wpsc.example.test/webhook/company-a"
    });

    assert.equal(result.ok, true);
    assert.deepEqual(calls, { register: 1, unregister: 0, verify: 1 });
    assert.deepEqual(result.events.map((event) => event.type), [WebhookActivationEvent.REGISTERED]);
    assert.equal(result.metadata.webhookId, "source-webhook-1");
    assert.equal(result.metadata.webhookStatus, "verified");
    assert.equal(result.metadata.webhookRegisteredAt, "2026-07-28T01:00:00.000Z");
    assert.deepEqual(await repository.readSourceMetadata("company-a"), result.metadata);
  } finally {
    await rm(workspaceDir, { force: true, recursive: true });
  }
});

test("Webhook Activation loads saved source credentials instead of receiving them from Browser", async () => {
  const { repository, workspaceDir } = await createFixture();
  const calls = { register: 0, unregister: 0, verify: 0 };
  let adapterOptions;
  const service = createWebhookActivationService({
    adapterLoader: { load: (_type, options) => { adapterOptions = options; return createAdapter(calls); } },
    credentialStore: { read: async () => ({ applicationPassword: "stored-password", wordpressUsername: "admin" }) },
    repository
  });
  try {
    const result = await service.activate({ siteId: "company-a", webhookUrl: "https://wpsc.example.test/webhook/company-a" });
    assert.equal(result.ok, true);
    assert.deepEqual(adapterOptions.credentials, { applicationPassword: "stored-password", wordpressUsername: "admin" });
  } finally {
    await rm(workspaceDir, { force: true, recursive: true });
  }
});

test("Webhook Activation removes only an existing webhook and persists removal metadata", async () => {
  const { repository, workspaceDir } = await createFixture();
  const calls = { register: 0, unregister: 0, verify: 0 };
  await repository.writeSourceMetadata("company-a", {
    ...(await repository.readSourceMetadata("company-a")),
    webhookId: "source-webhook-1",
    webhookStatus: "verified"
  });
  const registry = createSourceRegistry({
    adapters: [{ create: () => createAdapter(calls), type: "rest" }]
  });
  const service = createWebhookActivationService({
    adapterLoader: createSourceAdapterLoader({ registry }),
    repository
  });

  try {
    const result = await service.remove({ siteId: "company-a" });

    assert.equal(result.ok, true);
    assert.deepEqual(calls, { register: 0, unregister: 1, verify: 0 });
    assert.deepEqual(result.events.map((event) => event.type), [WebhookActivationEvent.REMOVED]);
    assert.equal(result.metadata.webhookId, null);
    assert.equal(result.metadata.webhookStatus, "removed");
  } finally {
    await rm(workspaceDir, { force: true, recursive: true });
  }
});

test("Webhook Activation does not persist when verification fails", async () => {
  const { repository, workspaceDir } = await createFixture();
  const calls = { register: 0, unregister: 0, verify: 0 };
  const registry = createSourceRegistry({
    adapters: [{
      create: () => createAdapter(calls, {
        verifyWebhook: async () => {
          calls.verify += 1;
          return {
            diagnostics: { errors: [{ code: "webhook.verify.failed", message: "Webhook is not reachable.", severity: "error" }], warnings: [] },
            ok: false
          };
        }
      }),
      type: "rest"
    }]
  });
  const service = createWebhookActivationService({
    adapterLoader: createSourceAdapterLoader({ registry }),
    repository
  });

  try {
    const result = await service.activate({ siteId: "company-a", webhookUrl: "https://wpsc.example.test/webhook/company-a" });

    assert.equal(result.ok, false);
    assert.deepEqual(calls, { register: 1, unregister: 0, verify: 1 });
    assert.deepEqual(result.events.map((event) => event.type), [WebhookActivationEvent.FAILED]);
    assert.equal((await repository.readSourceMetadata("company-a")).webhookId, undefined);
  } finally {
    await rm(workspaceDir, { force: true, recursive: true });
  }
});
