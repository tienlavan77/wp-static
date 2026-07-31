import assert from "node:assert/strict";
import test from "node:test";
import createSetupApi from "../framework/src/api/createSetupApi.js";
import createSiteSetupCommand from "../framework/src/cli/createSiteSetupCommand.js";
import createSetupService, { SetupClient } from "../framework/src/setup/createSetupService.js";
import { SetupState } from "../framework/src/setup/createSetupStateMachine.js";

function createRegistrationService(calls) {
  return {
    async register(input) {
      calls.push({ type: "register", input });
      return { diagnostics: { errors: [], warnings: [] }, events: [{ type: "source.connected" }], ok: true };
    }
  };
}

function createWebhookService(calls) {
  return {
    async activate(input) {
      calls.push({ type: "webhook", input });
      return { diagnostics: { errors: [], warnings: [] }, events: [{ type: "webhook.registered" }], ok: true };
    }
  };
}

test("Setup Service orchestrates source and webhook services without changing their workflows", async () => {
  const calls = [];
  const service = createSetupService({
    createSessionId: () => "source-session",
    now: () => "2026-07-28T00:00:00.000Z",
    sourceRegistrationService: createRegistrationService(calls),
    webhookActivationService: createWebhookService(calls)
  });
  const started = service.start({ client: SetupClient.CLI, siteId: "company-a" });
  const result = await service.registerSource(started.session.id, {
    credentials: { token: "secret" },
    source: { endpoint: "https://source.example", type: "wordpress" },
    webhookUrl: "https://wpsc.example/webhook"
  });

  assert.equal(result.ok, true);
  assert.equal(result.session.currentStateId, SetupState.REGISTERING_SOURCE);
  assert.deepEqual(calls, [
    { type: "register", input: {
      credentials: { token: "secret" },
      siteId: "company-a",
      source: { endpoint: "https://source.example", type: "wordpress" },
      webhookUrl: "https://wpsc.example/webhook"
    } },
    { type: "webhook", input: {
      adapterOptions: undefined,
      siteId: "company-a",
      webhookUrl: "https://wpsc.example/webhook"
    } }
  ]);
  assert.deepEqual(result.events.map((event) => event.type), ["source.connected", "webhook.registered"]);
});

test("Setup REST is a thin gateway for source registration", async () => {
  const calls = [];
  const service = createSetupService({
    createSessionId: () => "browser-source-session",
    now: () => "2026-07-28T00:00:00.000Z",
    sourceRegistrationService: createRegistrationService(calls)
  });
  const api = createSetupApi({ setupService: service });
  const started = api.start({ siteId: "company-a" });
  const result = await api.source({
    sessionId: started.session.id,
    source: { endpoint: "https://source.example", type: "ghost" }
  });

  assert.equal(result.ok, true);
  assert.equal(result.session.currentStateId, SetupState.REGISTERING_SOURCE);
  assert.equal(calls[0].input.siteId, "company-a");
  assert.equal(SetupState.READY_FOR_FIRST_BUILD, "READY_FOR_FIRST_BUILD");
});

test("site:setup calls Setup Service directly for source registration", async () => {
  const calls = [];
  const command = createSiteSetupCommand({
    setupService: createSetupService({
      createSessionId: () => "cli-source-session",
      now: () => "2026-07-28T00:00:00.000Z",
      sourceRegistrationService: createRegistrationService(calls)
    }),
    write: () => {}
  });
  const result = await command.run({
    siteId: "company-a",
    source: { endpoint: "https://source.example", type: "wordpress" }
  });

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input.source.type, "wordpress");
});
