import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createSourceAdapterLoader from "../src/source/createSourceAdapterLoader.js";
import createSourceRegistry from "../src/source/createSourceRegistry.js";
import createSiteRepository from "../src/site/createSiteRepository.js";
import createSourceRegistrationService, {
  SourceRegistrationEvent
} from "../src/setup/createSourceRegistrationService.js";

function ok() {
  return { diagnostics: { errors: [], warnings: [] }, ok: true };
}

function createAdapter(calls, overrides = {}) {
  return {
    getMetadata: async () => ({
      adapterVersion: "1.2.3",
      capabilities: ["webhook", "build-ready"],
      runtimeToken: "must-not-persist",
      sourceType: "rest"
    }),
    healthCheck: async () => {
      calls.healthCheck += 1;
      return ok();
    },
    initialize: async () => {
      calls.initialize += 1;
      return ok();
    },
    registerWebhook: async () => {
      calls.registerWebhook += 1;
      return ok();
    },
    unregisterWebhook: async () => ok(),
    validate: async () => {
      calls.validate += 1;
      return ok();
    },
    verifyWebhook: async () => ok(),
    ...overrides
  };
}

test("Source Registration Service validates, checks connectivity, and persists safe metadata", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-source-registration-"));
  const calls = { healthCheck: 0, initialize: 0, registerWebhook: 0, validate: 0 };
  const registry = createSourceRegistry({
    adapters: [{ create: () => createAdapter(calls), type: "rest" }]
  });
  const repository = createSiteRepository({ workspaceDir });
  const service = createSourceRegistrationService({
    adapterLoader: createSourceAdapterLoader({ registry }),
    repository
  });

  try {
    const result = await service.register({
      credentials: { token: "private-token" },
      registeredAt: "2026-07-28T00:00:00.000Z",
      siteId: "company-a",
      source: { endpoint: "https://source.example.test", type: "rest" }
    });

    assert.equal(result.ok, true);
    assert.deepEqual(calls, { healthCheck: 1, initialize: 1, registerWebhook: 0, validate: 1 });
    assert.deepEqual(result.events.map((event) => event.type), [
      SourceRegistrationEvent.VALIDATED,
      SourceRegistrationEvent.CONNECTED
    ]);
    assert.deepEqual(result.metadata, {
      adapterVersion: "1.2.3",
      capabilities: ["build-ready", "webhook"],
      endpoint: "https://source.example.test",
      registeredAt: "2026-07-28T00:00:00.000Z",
      schema: "source-metadata",
      schemaVersion: 1,
      sourceType: "rest"
    });
    assert.equal(Object.hasOwn(result.metadata, "runtimeToken"), false);
    assert.deepEqual(await repository.readSourceMetadata("company-a"), result.metadata);
    assert.equal((await readFile(result.path, "utf8")).includes("private-token"), false);
  } finally {
    await rm(workspaceDir, { force: true, recursive: true });
  }
});

test("Source Registration Service does not persist or invoke webhook on validation failure", async () => {
  const calls = { healthCheck: 0, initialize: 0, registerWebhook: 0, validate: 0 };
  const repository = {
    writeSourceMetadata: async () => {
      throw new Error("metadata must not be written");
    }
  };
  const registry = createSourceRegistry({
    adapters: [{
      create: () => createAdapter(calls, {
        validate: async () => {
          calls.validate += 1;
          return {
            diagnostics: {
              errors: [{ code: "source.credentials.invalid", message: "Credentials are invalid.", severity: "error" }],
              warnings: []
            },
            ok: false
          };
        }
      }),
      type: "rest"
    }]
  });
  const result = await createSourceRegistrationService({
    adapterLoader: createSourceAdapterLoader({ registry }),
    repository
  }).register({
    siteId: "company-a",
    source: { endpoint: "https://source.example.test", type: "rest" }
  });

  assert.equal(result.ok, false);
  assert.deepEqual(calls, { healthCheck: 0, initialize: 1, registerWebhook: 0, validate: 1 });
  assert.deepEqual(result.events.map((event) => event.type), [SourceRegistrationEvent.FAILED]);
  assert.deepEqual(result.diagnostics.errors.map((error) => error.code), ["source.credentials.invalid"]);
});

test("Source Registration Service tests connection without persisting metadata", async () => {
  const calls = { healthCheck: 0, initialize: 0, registerWebhook: 0, validate: 0 };
  const registry = createSourceRegistry({ adapters: [{ create: () => createAdapter(calls), type: "rest" }] });
  const result = await createSourceRegistrationService({
    adapterLoader: createSourceAdapterLoader({ registry }),
    repository: { writeSourceMetadata: async () => { throw new Error("must not persist"); } }
  }).testConnection({ siteId: "company-a", source: { endpoint: "https://source.example.test", type: "rest" } });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, { healthCheck: 1, initialize: 1, registerWebhook: 0, validate: 1 });
});

test("Source Registration Service checks stored credentials when the Dashboard sends no credential changes", async () => {
  let receivedCredentials;
  const credentialStore = {
    read: async () => ({ applicationPassword: "stored-app-password", wordpressUsername: "saved-admin" })
  };
  const registry = createSourceRegistry({
    adapters: [{
      create: (options) => createAdapter({ healthCheck: 0, initialize: 0, registerWebhook: 0, validate: 0 }, {
        validate: async ({ credentials }) => {
          receivedCredentials = credentials;
          return ok();
        }
      }),
      type: "rest"
    }]
  });
  const result = await createSourceRegistrationService({
    adapterLoader: createSourceAdapterLoader({ registry }),
    credentialStore,
    repository: { writeSourceMetadata: async () => { throw new Error("must not persist"); } }
  }).testConnection({ siteId: "company-a", source: { endpoint: "https://source.example.test", type: "rest" } });

  assert.equal(result.ok, true);
  assert.deepEqual(receivedCredentials, { applicationPassword: "stored-app-password", wordpressUsername: "saved-admin" });
});

test("Source Registration Service converts adapter exceptions into workflow diagnostics", async () => {
  const registry = createSourceRegistry({
    adapters: [{
      create: () => createAdapter({ healthCheck: 0, initialize: 0, registerWebhook: 0, validate: 0 }, {
        healthCheck: async () => {
          throw new Error("source offline");
        }
      }),
      type: "rest"
    }]
  });
  const result = await createSourceRegistrationService({
    adapterLoader: createSourceAdapterLoader({ registry }),
    repository: { writeSourceMetadata: async () => ({}) }
  }).register({
    siteId: "company-a",
    source: { endpoint: "https://source.example.test", type: "rest" }
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.diagnostics.errors.map((error) => error.code), [
    "source.registration.health.failed"
  ]);
});
