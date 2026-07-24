import { readFile } from "node:fs/promises";
import path from "node:path";

export const PRODUCTION_INSTALL_BUILD_VERSION = "1.0";

function assertBuildRunner(buildRunner) {
  if (typeof buildRunner !== "function") {
    throw new TypeError("Production Install Build requires a buildRunner function.");
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function createBuildSummary(build = {}, startedAt, finishedAt) {
  return {
    durationMs: finishedAt - startedAt,
    finishedAt,
    manifestPath: build.result?.manifestPath || build.manifestPath || null,
    outputDir: build.result?.outputDir || build.outputDir || null,
    pages: build.result?.pagesWritten ?? build.pages ?? null,
    production: build.result?.production || build.production || null,
    raw: build,
    startedAt
  };
}

export default function createProductionInstallBuild(options = {}) {
  const buildRunner = options.buildRunner;

  assertBuildRunner(buildRunner);

  return {
    version: PRODUCTION_INSTALL_BUILD_VERSION,

    async run(persistedConfiguration, runOptions = {}) {
      if (!persistedConfiguration?.projectPath || !persistedConfiguration?.runtimePath) {
        throw new Error("Production build requires persisted project and runtime configuration paths.");
      }

      const project = await readJson(persistedConfiguration.projectPath);
      const runtime = await readJson(persistedConfiguration.runtimePath);
      const projectDir = runOptions.projectDir || path.dirname(path.dirname(persistedConfiguration.projectPath));
      const startedAt = Date.now();

      try {
        const build = await buildRunner(projectDir, {
          configuration: {
            project,
            runtime
          },
          production: true
        });
        const finishedAt = Date.now();

        return {
          build: createBuildSummary(build, startedAt, finishedAt),
          diagnostics: {
            errors: [],
            warnings: []
          },
          ok: true,
          project,
          projectDir,
          runtime,
          version: PRODUCTION_INSTALL_BUILD_VERSION
        };
      } catch (error) {
        return {
          build: null,
          diagnostics: {
            errors: [
              {
                code: "install.production_build.failed",
                detail: {
                  message: error.message
                },
                message: "Production build failed."
              }
            ],
            warnings: []
          },
          ok: false,
          project,
          projectDir,
          runtime,
          version: PRODUCTION_INSTALL_BUILD_VERSION
        };
      }
    }
  };
}
