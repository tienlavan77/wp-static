import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import buildReleasePackage, {
  RELEASE_BUILDER_VERSION
} from "../framework/src/release/buildReleasePackage.js";

async function fixtureDir() {
  return mkdtemp(path.join(tmpdir(), "wpsc-release-builder-"));
}

test("buildReleasePackage creates release structure and manifest", async () => {
  const projectDir = await fixtureDir();
  const outputDir = path.join(projectDir, "dist-release");

  const result = await buildReleasePackage({
    generatedAt: "2026-07-26T00:00:00.000Z",
    outputDir,
    packageName: "store-release",
    projectDir
  });
  const manifest = JSON.parse(await readFile(result.manifestPath, "utf8"));

  assert.equal(result.ok, true);
  assert.equal(result.version, RELEASE_BUILDER_VERSION);
  assert.equal(result.outputDir, outputDir);
  assert.equal(manifest.packageName, "store-release");
  assert.equal(manifest.mode, "vps");
  assert.equal(manifest.publicRoot, "public");
  assert.equal(manifest.releaseBuilderVersion, RELEASE_BUILDER_VERSION);
  assert.equal(result.files.some((file) => file.endsWith("index.php")), true);
});

test("buildReleasePackage copies optional project public themes and plugins", async () => {
  const projectDir = await fixtureDir();
  await mkdir(path.join(projectDir, "public"), {
    recursive: true
  });
  await mkdir(path.join(projectDir, "themes", "default"), {
    recursive: true
  });
  await mkdir(path.join(projectDir, "plugins", "demo"), {
    recursive: true
  });
  await writeFile(path.join(projectDir, "public", "index.html"), "home");
  await writeFile(path.join(projectDir, "themes", "default", "theme.json"), "{}");
  await writeFile(path.join(projectDir, "plugins", "demo", "plugin.json"), "{}");

  const result = await buildReleasePackage({
    mode: "shared-hosting",
    outputDir: "release-output",
    projectDir
  });

  assert.equal(result.structure.mode, "shared-hosting");
  assert.equal(await readFile(path.join(result.outputDir, "public", "index.html"), "utf8"), "home");
  assert.equal(await readFile(path.join(result.outputDir, "themes", "default", "theme.json"), "utf8"), "{}");
  assert.equal(await readFile(path.join(result.outputDir, "plugins", "demo", "plugin.json"), "utf8"), "{}");
});
