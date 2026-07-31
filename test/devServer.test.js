import assert from "node:assert/strict";
import { cp, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import buildProjectOnce from "../framework/src/dev-server/buildProjectOnce.js";
import watchBuildProject from "../framework/src/dev-server/watchBuildProject.js";
import createWatchTargets from "../framework/src/watcher/createWatchTargets.js";
import loadConfig from "../framework/src/core/loadConfig.js";

test("buildProjectOnce builds a project for dev mode", async () => {
  const projectDir = await createIsolatedCommerceProject("wpsc-dev-build-");
  const { config, result, sitePlan } = await buildProjectOnce(projectDir);

  assert.equal(config.name, "WPSC Commerce");
  assert.equal(sitePlan.pages.length, 2);
  assert.equal(result.pagesWritten, 2);
});

test("createWatchTargets includes config, content, public, and theme paths", async () => {
  const projectDir = await createIsolatedCommerceProject("wpsc-watch-targets-");
  const config = await loadConfig(projectDir);
  const targets = await createWatchTargets(config);
  const relativeTargets = targets.map((target) => path.relative(config._paths.projectDir, target));

  assert.equal(relativeTargets.includes("wpsc.config.js"), true);
  assert.equal(relativeTargets.includes("content.json"), true);
  assert.equal(relativeTargets.includes("public"), true);
  assert.equal(relativeTargets.includes("theme/layout.js"), true);
});

test("watchBuildProject performs initial build and exposes watched targets", async () => {
  const projectDir = await createIsolatedCommerceProject("wpsc-build-watch-");
  const logs = [];
  const watcher = await watchBuildProject(projectDir, {
    debounceMs: 10,
    logger: {
      error(message) {
        logs.push(message);
      },
      info(message) {
        logs.push(message);
      }
    },
    persistent: false
  });

  try {
    assert.equal(watcher.build.config.name, "WPSC Commerce");
    assert.equal(watcher.build.result.pagesWritten, 2);
    assert.equal(watcher.targets.some((target) => target.endsWith("wpsc.config.js")), true);
    assert.equal(logs.some((message) => /Watching \d+ paths/.test(message)), true);
  } finally {
    watcher.close();
  }
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
