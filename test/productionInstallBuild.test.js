import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createInstallationConfigGenerator from "../src/installer/createInstallationConfigGenerator.js";
import persistInstallationConfiguration from "../src/release/persistInstallationConfiguration.js";
import createProductionInstallBuild, {
  PRODUCTION_INSTALL_BUILD_VERSION
} from "../src/release/createProductionInstallBuild.js";

async function createPersistedConfig() {
  const releaseDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-release-"));
  const configuration = createInstallationConfigGenerator({
    domain: "https://store.example.com",
    outputDir: "public",
    projectDir: releaseDir,
    siteName: "Store",
    wordpressUrl: "https://api.example.com"
  });

  return persistInstallationConfiguration({
    configuration,
    generatedAt: "2026-07-24T00:00:00.000Z",
    releaseDir
  });
}

test("createProductionInstallBuild runs production build from persisted config", async () => {
  const persisted = await createPersistedConfig();
  const calls = [];
  const productionBuild = createProductionInstallBuild({
    async buildRunner(projectDir, options) {
      calls.push({ options, projectDir });
      return {
        result: {
          manifestPath: path.join(projectDir, "public", "manifest.json"),
          outputDir: path.join(projectDir, "public"),
          pagesWritten: 12,
          production: {
            enabled: true
          }
        }
      };
    }
  });
  const result = await productionBuild.run(persisted);

  assert.equal(productionBuild.version, PRODUCTION_INSTALL_BUILD_VERSION);
  assert.equal(result.ok, true);
  assert.equal(result.version, PRODUCTION_INSTALL_BUILD_VERSION);
  assert.equal(result.project.name, "Store");
  assert.equal(result.runtime.mode, "development");
  assert.equal(result.build.pages, 12);
  assert.equal(result.build.production.enabled, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.production, true);
  assert.equal(calls[0].options.configuration.project.name, "Store");
});

test("createProductionInstallBuild reports structured build failures", async () => {
  const persisted = await createPersistedConfig();
  const productionBuild = createProductionInstallBuild({
    async buildRunner() {
      throw new Error("source unavailable");
    }
  });
  const result = await productionBuild.run(persisted);

  assert.equal(result.ok, false);
  assert.equal(result.build, null);
  assert.deepEqual(result.diagnostics.errors, [
    {
      code: "install.production_build.failed",
      detail: {
        message: "source unavailable"
      },
      message: "Production build failed."
    }
  ]);
});

test("createProductionInstallBuild validates dependencies and persisted config", async () => {
  assert.throws(() => createProductionInstallBuild(), /buildRunner/);

  const productionBuild = createProductionInstallBuild({
    async buildRunner() {
      return {};
    }
  });

  await assert.rejects(
    () => productionBuild.run({}),
    /persisted project and runtime/
  );
});
