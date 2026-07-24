import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createInstallationConfigGenerator from "../src/installer/createInstallationConfigGenerator.js";
import persistInstallationConfiguration, {
  PERSISTENT_CONFIGURATION_VERSION
} from "../src/release/persistInstallationConfiguration.js";

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

test("persistInstallationConfiguration writes project runtime and state files", async () => {
  const releaseDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-release-"));
  const configuration = createInstallationConfigGenerator({
    domain: "https://store.example.com",
    outputDir: "public",
    projectDir: releaseDir,
    siteName: "Store",
    wordpressUrl: "https://api.example.com"
  });

  const result = await persistInstallationConfiguration({
    configuration,
    generatedAt: "2026-07-24T00:00:00.000Z",
    releaseDir
  });

  assert.equal(result.version, PERSISTENT_CONFIGURATION_VERSION);
  assert.equal(result.ok, true);
  assert.deepEqual(result.files, [
    path.join(releaseDir, "config", "project.json"),
    path.join(releaseDir, "config", "runtime.json"),
    path.join(releaseDir, "config", "install-state.json")
  ]);

  const project = await readJson(result.projectPath);
  const runtime = await readJson(result.runtimePath);
  const state = await readJson(result.statePath);

  assert.equal(project.name, "Store");
  assert.equal(project.site.url, "https://store.example.com");
  assert.equal(project.generatedAt, "2026-07-24T00:00:00.000Z");
  assert.equal(runtime.paths.outputDir, path.join(releaseDir, "public"));
  assert.equal(state.installed, false);
  assert.equal(state.lockPath, path.join(releaseDir, "config", "install.lock"));
});

test("persistInstallationConfiguration supports custom config directory", async () => {
  const releaseDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-release-"));
  const configuration = createInstallationConfigGenerator({
    projectDir: releaseDir,
    wordpressUrl: "https://api.example.com"
  });
  const result = await persistInstallationConfiguration({
    configDir: "private-config",
    configuration,
    releaseDir
  });

  assert.equal(result.configDir, path.join(releaseDir, "private-config"));
  assert.equal(result.projectPath, path.join(releaseDir, "private-config", "project.json"));
});

test("persistInstallationConfiguration rejects invalid configuration", async () => {
  const releaseDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-release-"));
  const invalid = createInstallationConfigGenerator({
    mode: "bad-mode",
    projectDir: releaseDir,
    wordpressUrl: "https://api.example.com"
  });

  await assert.rejects(
    () =>
      persistInstallationConfiguration({
        configuration: invalid,
        releaseDir
      }),
    /not supported/
  );

  await assert.rejects(
    () =>
      persistInstallationConfiguration({
        configuration: {},
        releaseDir
      }),
    /project and runtime/
  );
});
