import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import buildSite from "../src/builder/buildSite.js";
import compile from "../src/core/compile.js";
import loadConfig from "../src/core/loadConfig.js";

test("build pipeline writes html files and manifest", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-build-"));
  const config = await loadConfig("examples/basic-shop");
  const testConfig = {
    ...config,
    outputDir,
    _paths: {
      ...config._paths,
      outputDir
    }
  };
  const sitePlan = await compile(testConfig);
  const result = await buildSite(sitePlan, {
    config: testConfig,
    outputDir,
    publicDir: config._paths.publicDir
  });
  const manifest = JSON.parse(await readFile(result.manifestPath, "utf8"));

  assert.equal(result.pagesWritten, 8);
  assert.equal(result.totalPages, 8);
  assert.equal(result.fullBuild, true);
  assert.equal(manifest.pages, 8);
  assert.equal(manifest.incremental.fullBuild, true);
  assert.equal(manifest.routes.some((route) => route.path === "/iphone-15"), true);
  assert.equal(manifest.routes.some((route) => route.path === "/iphone-15-128gb-den"), true);
  assert.equal(manifest.routes.some((route) => route.outputPath === "iphone-15.html"), true);
  assert.equal(manifest.routes.some((route) => route.path === "/dien-thoai"), true);
});
