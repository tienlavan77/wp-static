import assert from "node:assert/strict";
import test from "node:test";
import createInstallationSession, {
  INSTALLATION_SESSION_VERSION,
  INSTALLATION_STEPS
} from "../src/installer/createInstallationSession.js";

test("createInstallationSession starts with lifecycle metadata", () => {
  const session = createInstallationSession({
    id: "install-1",
    input: {
      domain: "https://example.com"
    }
  });
  const state = session.getState();

  assert.equal(session.version, INSTALLATION_SESSION_VERSION);
  assert.deepEqual(INSTALLATION_STEPS, [
    "START",
    "CHECK",
    "CONFIGURE",
    "VALIDATE",
    "BUILD",
    "FINISH"
  ]);
  assert.equal(state.id, "install-1");
  assert.equal(state.step, "START");
  assert.equal(state.progress.current, 1);
  assert.equal(state.progress.total, 6);
  assert.equal(state.progress.percent, 17);
  assert.deepEqual(state.input, {
    domain: "https://example.com"
  });
});

test("createInstallationSession advances through the install lifecycle", () => {
  const session = createInstallationSession({
    id: "install-2"
  });

  session.updateInput({
    wordpressUrl: "https://api.example.com"
  });
  session.transition("CHECK", {
    checks: 3
  });
  session.transition("CONFIGURE");
  session.transition("VALIDATE");
  session.transition("BUILD");
  const finalState = session.finish({
    outputDir: "dist"
  });

  assert.equal(finalState.step, "FINISH");
  assert.equal(finalState.progress.percent, 100);
  assert.deepEqual(finalState.result, {
    outputDir: "dist"
  });
  assert.deepEqual(
    finalState.progress.history.map((entry) => entry.step),
    ["START", "CHECK", "CONFIGURE", "VALIDATE", "BUILD", "FINISH"]
  );
});

test("createInstallationSession records diagnostics", () => {
  const session = createInstallationSession({
    id: "install-3"
  });

  session.addWarning("install.domain.local", "Local domain is used.", {
    domain: "http://localhost"
  });
  const state = session.addError("install.wp.missing", "WordPress URL is required.");

  assert.deepEqual(state.diagnostics.warnings, [
    {
      code: "install.domain.local",
      detail: {
        domain: "http://localhost"
      },
      message: "Local domain is used.",
      type: "warning"
    }
  ]);
  assert.deepEqual(state.diagnostics.errors, [
    {
      code: "install.wp.missing",
      detail: null,
      message: "WordPress URL is required.",
      type: "error"
    }
  ]);
});

test("createInstallationSession rejects invalid transitions", () => {
  const session = createInstallationSession({
    id: "install-4"
  });

  assert.throws(() => session.transition("VALIDATE"), /Cannot transition/);
  assert.throws(() => session.transition("UNKNOWN"), /Unknown installation step/);
  assert.throws(() => session.finish(), /only finish after BUILD/);
});

test("createInstallationSession can fail before finish and then becomes terminal", () => {
  const session = createInstallationSession({
    id: "install-5"
  });
  const failed = session.fail("install.failed", "Install failed.", {
    reason: "test"
  });

  assert.equal(failed.step, "FAILED");
  assert.equal(failed.diagnostics.errors[0].code, "install.failed");
  assert.throws(() => session.updateInput({}), /already FAILED/);
  assert.throws(() => session.transition("CHECK"), /already FAILED/);
});
