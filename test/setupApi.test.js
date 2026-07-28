import assert from "node:assert/strict";
import test from "node:test";
import createSetupApi, {
  SETUP_API_VERSION,
  SetupApiRoute
} from "../src/api/createSetupApi.js";
import createSetupService, { SetupClient } from "../src/setup/createSetupService.js";
import { SetupState } from "../src/setup/createSetupStateMachine.js";

test("Setup API is a browser gateway over Setup Service and returns revision", () => {
  const service = createSetupService({
    createSessionId: () => "setup-api-session",
    now: () => "2026-07-27T00:00:00.000Z"
  });
  const api = createSetupApi({ setupService: service });
  const started = api.start({
    client: SetupClient.CLI,
    siteId: "company-a"
  });

  assert.equal(api.version, SETUP_API_VERSION);
  assert.equal(started.ok, true);
  assert.equal(started.session.currentStateId, SetupState.NOT_STARTED);
  assert.equal(started.session.revision, 0);
  assert.deepEqual(started.presentation, {
    canAdvance: true,
    canFinalize: false,
    progress: 0,
    revision: 0,
    sourceRegistrationAvailable: false,
    title: "Setup is ready to begin"
  });
  assert.equal(service.getSession(started.session.id).session.context.client, SetupClient.BROWSER);
  assert.equal(Object.hasOwn(api, "transition"), false);
  assert.equal(SetupApiRoute.ADVANCE, "POST /setup/sessions/:sessionId/advance");

  const advanced = api.advance({
    nextState: SetupState.READY,
    sessionId: started.session.id
  });
  assert.equal(advanced.ok, true);
  assert.equal(advanced.session.currentStateId, SetupState.VALIDATING);
  assert.equal(advanced.session.revision, 1);
  assert.equal(advanced.presentation.revision, 1);

  const state = api.state({ sessionId: started.session.id });
  assert.equal(state.session.currentStateId, SetupState.VALIDATING);
  assert.equal(state.session.revision, 1);

  const ended = api.end({ sessionId: started.session.id });
  assert.equal(ended.session.revision, 1);
  assert.equal(api.state({ sessionId: started.session.id }).session.revision, 1);
});

test("Setup API validates requests and returns Setup Service diagnostics", () => {
  const api = createSetupApi({ setupService: createSetupService() });

  assert.deepEqual(api.start({}).diagnostics.errors.map((error) => error.code), [
    "setup.api.site_id.required"
  ]);
  assert.deepEqual(api.state({}).diagnostics.errors.map((error) => error.code), [
    "setup.api.session_id.required"
  ]);
  assert.deepEqual(api.advance({ sessionId: "missing" }).diagnostics.errors.map((error) => error.code), [
    "setup.session.not_found"
  ]);
});
