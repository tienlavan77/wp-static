import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import buildReleasePackage from "../framework/src/release/buildReleasePackage.js";
import createInstallationLock from "../framework/src/release/createInstallationLock.js";
import validateReleasePackage, {
  RELEASE_VALIDATION_VERSION
} from "../framework/src/release/validateReleasePackage.js";

async function fixtureDir() {
  return mkdtemp(path.join(tmpdir(), "wpsc-release-validation-"));
}

test("validateReleasePackage validates generated release package", async () => {
  const projectDir = await fixtureDir();
  const releaseDir = path.join(projectDir, "release");
  await buildReleasePackage({
    outputDir: releaseDir,
    projectDir
  });
  await createInstallationLock({
    releaseDir
  }).create({
    installedAt: "2026-07-26T00:00:00.000Z"
  });

  const result = await validateReleasePackage({
    releaseDir
  });

  assert.equal(result.version, RELEASE_VALIDATION_VERSION);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.errors.length, 0);
  assert.equal(result.checks.some((item) => item.code === "release.manifest.readable" && item.ok), true);
  assert.equal(result.checks.some((item) => item.code === "release.lock.installed" && item.ok), true);
});

test("validateReleasePackage warns when install lock is missing", async () => {
  const projectDir = await fixtureDir();
  const releaseDir = path.join(projectDir, "release");
  await buildReleasePackage({
    outputDir: releaseDir,
    projectDir
  });

  const result = await validateReleasePackage({
    releaseDir
  });

  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.warnings.some((item) => item.code === "release.lock.installed"), true);
});

test("validateReleasePackage fails when required release files are missing", async () => {
  const projectDir = await fixtureDir();
  const releaseDir = path.join(projectDir, "release");
  await buildReleasePackage({
    outputDir: releaseDir,
    projectDir
  });
  await rm(path.join(releaseDir, "index.php"));

  const result = await validateReleasePackage({
    releaseDir
  });

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics.errors.some((item) => item.detail.path === "index.php"), true);
});
