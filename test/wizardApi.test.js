import assert from "node:assert/strict";
import test from "node:test";
import createWizardApi, {
  WIZARD_API_VERSION
} from "../framework/src/installer/createWizardApi.js";

test("createWizardApi creates and exposes installation sessions", () => {
  const api = createWizardApi();
  const response = api.create(
    {
      domain: "https://example.com"
    },
    {
      id: "install-1"
    }
  );

  assert.equal(api.version, WIZARD_API_VERSION);
  assert.equal(response.ok, true);
  assert.equal(response.state.id, "install-1");
  assert.equal(response.state.step, "START");
  assert.deepEqual(response.state.input, {
    domain: "https://example.com"
  });

  const state = api.state("install-1");

  assert.equal(state.ok, true);
  assert.equal(state.state.id, "install-1");
});

test("createWizardApi updates state and transitions lifecycle", () => {
  const api = createWizardApi();

  api.create({}, { id: "install-2" });
  const updated = api.update("install-2", {
    wordpressUrl: "https://api.example.com"
  });
  const checked = api.transition("install-2", "CHECK", {
    checks: 2
  });

  assert.equal(updated.ok, true);
  assert.equal(updated.state.input.wordpressUrl, "https://api.example.com");
  assert.equal(checked.ok, true);
  assert.equal(checked.state.step, "CHECK");
  assert.equal(checked.state.progress.percent, 33);
});

test("createWizardApi exposes diagnostics actions", () => {
  const api = createWizardApi();

  api.create({}, { id: "install-3" });

  const warning = api.warning(
    "install-3",
    "install.domain.local",
    "Local domain is used.",
    {
      domain: "http://localhost"
    }
  );
  const failed = api.fail("install-3", "install.failed", "Install failed.");

  assert.equal(warning.ok, true);
  assert.equal(warning.state.diagnostics.warnings[0].code, "install.domain.local");
  assert.equal(failed.ok, true);
  assert.equal(failed.state.step, "FAILED");
  assert.equal(failed.state.diagnostics.errors[0].code, "install.failed");
});

test("createWizardApi returns structured errors for invalid actions", () => {
  const api = createWizardApi();

  api.create({}, { id: "install-4" });

  const missing = api.state("missing");
  const invalidTransition = api.transition("install-4", "VALIDATE");

  assert.equal(missing.ok, false);
  assert.equal(missing.error.code, "wizard.action.failed");
  assert.match(missing.error.message, /not found/);
  assert.equal(invalidTransition.ok, false);
  assert.match(invalidTransition.error.message, /Cannot transition/);
});

test("createWizardApi lists sessions without exposing internals", () => {
  const api = createWizardApi();

  api.create({}, { id: "install-a" });
  api.create({}, { id: "install-b" });

  const list = api.list();

  assert.equal(list.ok, true);
  assert.deepEqual(
    list.sessions.map((session) => session.id),
    ["install-a", "install-b"]
  );
  assert.equal(typeof list.sessions[0].transition, "undefined");
});
