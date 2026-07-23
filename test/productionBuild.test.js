import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import buildProductionProjectOnce from "../src/dev-server/buildProductionProjectOnce.js";

const execFileAsync = promisify(execFile);

test("buildProductionProjectOnce marks result and manifest as production", async () => {
  const projectDir = await createIsolatedCommerceProject("wpsc-production-");
  const build = await buildProductionProjectOnce(projectDir);
  const manifest = JSON.parse(await readFile(build.result.manifestPath, "utf8"));

  assert.equal(build.result.productionBuild, true);
  assert.equal(build.result.production.enabled, true);
  assert.equal(build.result.production.mode, "production");
  assert.equal(manifest.production.enabled, true);
  assert.equal(manifest.production.mode, "production");
  assert.equal(manifest.production.optimizations.staticOutput, true);
});

test("cli build --production reports production mode", async () => {
  const projectDir = await createIsolatedCommerceProject("wpsc-production-cli-");
  const result = await execFileAsync("node", [
    "src/cli/index.js",
    "build",
    "--project",
    projectDir,
    "--production"
  ]);

  assert.match(result.stdout, /Mode: production/);
  assert.match(result.stdout, /Pages: 2/);
});

async function createIsolatedCommerceProject(prefix) {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), prefix));
  await cp("templates/commerce", projectDir, {
    filter(source) {
      return !source.includes(`${path.sep}dist`) && !source.includes(`${path.sep}.wpsc`);
    },
    recursive: true
  });

  return projectDir;
}
