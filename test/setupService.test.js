import assert from "node:assert/strict";
import test from "node:test";
import createSetupService, {
  SETUP_SERVICE_VERSION,
  SetupClient,
  SetupEvent,
  validateSetupContext
} from "../src/setup/createSetupService.js";

test("createSetupService creates an immutable shared setup context", () => {
  const observedEvents = [];
  const service = createSetupService({
    onEvent: (event) => observedEvents.push(event)
  });
  const result = service.createContext({
    client: SetupClient.BROWSER,
    siteId: " company-a "
  });

  assert.equal(service.version, SETUP_SERVICE_VERSION);
  assert.equal(result.ok, true);
  assert.deepEqual(result.context, { client: SetupClient.BROWSER, siteId: "company-a" });
  assert.equal(Object.isFrozen(result.context), true);
  assert.deepEqual(result.events.map((event) => event.type), [SetupEvent.CONTEXT_CREATED]);
  assert.deepEqual(observedEvents, result.events);
  assert.throws(() => {
    result.context.siteId = "other-site";
  }, TypeError);
});

test("createSetupService rejects invalid client and missing site context", () => {
  const result = createSetupService().createContext({ client: "desktop" });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.diagnostics.errors.map((error) => error.code),
    ["setup.context.client.invalid", "setup.context.site_id.required"]
  );
  assert.deepEqual(result.events.map((event) => event.type), [SetupEvent.CONTEXT_REJECTED]);
});

test("validateSetupContext accepts all supported setup clients", () => {
  for (const client of Object.values(SetupClient)) {
    assert.equal(validateSetupContext({ client, siteId: "company-a" }).ok, true);
  }
});
