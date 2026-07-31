import assert from "node:assert/strict";
import test from "node:test";
import createInstallationBuildOrchestrator, {
  INSTALLATION_BUILD_ORCHESTRATOR_VERSION
} from "../framework/src/installer/createInstallationBuildOrchestrator.js";
import createInstallationSession from "../framework/src/installer/createInstallationSession.js";

function createValidatedSession() {
  const session = createInstallationSession({
    id: "install-build",
    input: {
      projectDir: "/tmp/site"
    }
  });

  session.transition("CHECK");
  session.transition("CONFIGURE");
  session.transition("VALIDATE");

  return session;
}

test("createInstallationBuildOrchestrator runs initial build and finishes session", async () => {
  const calls = [];
  const session = createValidatedSession();
  const orchestrator = createInstallationBuildOrchestrator({
    async buildProject(payload) {
      calls.push(payload);
      return {
        outputDir: "/tmp/site/dist",
        pages: 12
      };
    }
  });

  const state = await orchestrator.run(session, {
    configuration: {
      project: {
        name: "Demo"
      }
    }
  });

  assert.equal(orchestrator.version, INSTALLATION_BUILD_ORCHESTRATOR_VERSION);
  assert.equal(state.step, "FINISH");
  assert.equal(state.result.build.outputDir, "/tmp/site/dist");
  assert.equal(state.result.build.pages, 12);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].projectDir, "/tmp/site");
  assert.equal(calls[0].session.step, "BUILD");
});

test("createInstallationBuildOrchestrator fails session on build errors", async () => {
  const session = createValidatedSession();
  const orchestrator = createInstallationBuildOrchestrator({
    async buildProject() {
      throw new Error("build exploded");
    }
  });

  const state = await orchestrator.run(session);

  assert.equal(state.step, "FAILED");
  assert.deepEqual(state.diagnostics.errors.at(-1), {
    code: "install.build.failed",
    detail: {
      message: "build exploded"
    },
    message: "Initial build failed.",
    type: "error"
  });
});

test("createInstallationBuildOrchestrator only starts after validate", async () => {
  const session = createInstallationSession({
    id: "install-not-ready"
  });
  const orchestrator = createInstallationBuildOrchestrator({
    async buildProject() {
      return {};
    }
  });

  await assert.rejects(() => orchestrator.run(session), /after VALIDATE/);
});

test("createInstallationBuildOrchestrator validates dependencies", () => {
  assert.throws(() => createInstallationBuildOrchestrator(), /buildProject/);

  const orchestrator = createInstallationBuildOrchestrator({
    async buildProject() {
      return {};
    }
  });

  assert.rejects(() => orchestrator.run(null), /installation session/);
});
