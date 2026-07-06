import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import buildProjectOnce from "../src/dev-server/buildProjectOnce.js";
import createWatchTargets from "../src/dev-server/createWatchTargets.js";
import loadConfig from "../src/core/loadConfig.js";

test("buildProjectOnce builds a project for dev mode", async () => {
  const { config, result, sitePlan } = await buildProjectOnce("examples/basic-shop");

  assert.equal(config.name, "Basic Shop");
  assert.equal(sitePlan.pages.length, 7);
  assert.equal(result.pagesWritten, 7);
});

test("createWatchTargets includes config, content, public, and theme paths", async () => {
  const config = await loadConfig("examples/basic-shop");
  const targets = await createWatchTargets(config);
  const relativeTargets = targets.map((target) => path.relative(config._paths.projectDir, target));

  assert.equal(relativeTargets.includes("wpsc.config.js"), true);
  assert.equal(relativeTargets.includes("content.json"), true);
  assert.equal(relativeTargets.includes("public"), true);
  assert.equal(relativeTargets.includes("theme/layout.js"), true);
  assert.equal(relativeTargets.includes("theme/layouts/page.js"), true);
  assert.equal(relativeTargets.includes("theme/layouts/product.js"), true);
  assert.equal(relativeTargets.includes("theme/components/index.js"), true);
  assert.equal(relativeTargets.includes("theme/assets"), true);
});
