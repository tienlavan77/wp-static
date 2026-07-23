export const INSTALLATION_BUILD_ORCHESTRATOR_VERSION = "1.0";

function assertSession(session) {
  if (!session || typeof session.getState !== "function") {
    throw new TypeError("Build Orchestrator requires an installation session.");
  }

  if (typeof session.transition !== "function" || typeof session.finish !== "function") {
    throw new TypeError("Installation session must support transition and finish.");
  }
}

function assertBuildProject(buildProject) {
  if (typeof buildProject !== "function") {
    throw new TypeError("Build Orchestrator requires a buildProject function.");
  }
}

function createBuildResult(result = {}, startedAt, finishedAt) {
  return {
    durationMs: finishedAt - startedAt,
    finishedAt,
    outputDir: result.outputDir || result.result?.outputDir || null,
    pages: result.pages ?? result.result?.pages?.length ?? result.result?.pageCount ?? null,
    raw: result,
    startedAt
  };
}

export default function createInstallationBuildOrchestrator(options = {}) {
  const buildProject = options.buildProject;

  assertBuildProject(buildProject);

  return {
    version: INSTALLATION_BUILD_ORCHESTRATOR_VERSION,

    async run(session, buildOptions = {}) {
      assertSession(session);

      const state = session.getState();
      if (state.step !== "VALIDATE") {
        throw new Error("Installation build can only start after VALIDATE.");
      }

      session.transition("BUILD", {
        reason: "initial-build-started"
      });

      const startedAt = Date.now();

      try {
        const result = await buildProject({
          configuration: buildOptions.configuration || null,
          projectDir: buildOptions.projectDir || state.input.projectDir || null,
          session: session.getState()
        });
        const finishedAt = Date.now();
        const build = createBuildResult(result, startedAt, finishedAt);

        return session.finish({
          build,
          configuration: buildOptions.configuration || null
        });
      } catch (error) {
        return session.fail("install.build.failed", "Initial build failed.", {
          message: error.message
        });
      }
    }
  };
}
