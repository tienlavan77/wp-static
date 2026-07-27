import assert from "node:assert/strict";
import test from "node:test";
import createSetupService, {
  SETUP_SERVICE_VERSION,
  SetupClient,
  SetupEvent,
  SetupState,
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

test("Setup Service owns the runtime session lifecycle", () => {
  const observedEvents = [];
  const timestamps = [
    "2026-07-27T01:00:00.000Z",
    "2026-07-27T02:00:00.000Z"
  ];
  const service = createSetupService({
    createSessionId: () => "setup-session-1",
    now: () => timestamps.shift(),
    onEvent: (event) => observedEvents.push(event)
  });
  const started = service.start({
    client: SetupClient.CLI,
    siteId: "company-a"
  });

  assert.equal(started.ok, true);
  assert.equal(started.session.id, "setup-session-1");
  assert.equal(started.session.currentStateId, SetupState.NOT_STARTED);
  assert.equal(started.session.expiresAt, null);
  assert.equal(started.session.context, started.context);
  assert.equal(Object.hasOwn(started.context, "session"), false);
  assert.equal(Object.isFrozen(started.session), true);
  assert.deepEqual(started.events.map((event) => event.type), [
    SetupEvent.STARTED,
    SetupEvent.CONTEXT_CREATED,
    SetupEvent.SESSION_CREATED
  ]);
  assert.deepEqual(observedEvents, started.events);
  assert.equal(service.getSession("setup-session-1").session, started.session);

  const ended = service.endSession("setup-session-1");
  assert.equal(ended.ok, true);
  assert.equal(ended.session.endedAt, "2026-07-27T02:00:00.000Z");
  assert.deepEqual(ended.events.map((event) => event.type), [SetupEvent.SESSION_ENDED]);
  assert.equal(service.endSession("setup-session-1").diagnostics.errors[0].code, "setup.session.ended");
});

test("Setup Service delegates workflow transitions to the state machine", () => {
  const service = createSetupService({
    createSessionId: () => "setup-state-session",
    now: () => "2026-07-27T03:00:00.000Z"
  });
  const started = service.start({ client: SetupClient.BROWSER, siteId: "company-a" });
  const transitioned = service.transition(started.session.id, SetupState.VALIDATING);

  assert.equal(transitioned.ok, true);
  assert.equal(transitioned.session.currentStateId, SetupState.VALIDATING);
  assert.deepEqual(transitioned.events.map((event) => event.type), [SetupEvent.STATE_CHANGED]);
  assert.equal(service.transition(started.session.id, SetupState.READY).ok, false);
});

test("Setup Service does not create a session for rejected context", () => {
  const service = createSetupService();
  const result = service.start({ client: "browser" });

  assert.equal(result.ok, false);
  assert.equal(Object.hasOwn(result, "session"), false);
  assert.deepEqual(result.events.map((event) => event.type), [
    SetupEvent.STARTED,
    SetupEvent.CONTEXT_REJECTED
  ]);
  assert.equal(service.getSession("missing").diagnostics.errors[0].code, "setup.session.not_found");
});
