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
  const dataManifest = JSON.parse(await readFile(result.routeData.manifestPath, "utf8"));
  const homeData = JSON.parse(await readFile(path.join(outputDir, "data", "routes", "index.json"), "utf8"));
  const productData = JSON.parse(await readFile(path.join(outputDir, "data", "routes", "iphone-15.json"), "utf8"));

  assert.equal(result.pagesWritten, 6);
  assert.equal(result.totalPages, 6);
  assert.equal(result.fullBuild, true);
  assert.equal(manifest.pages, 6);
  assert.equal(manifest.incremental.fullBuild, true);
  assert.equal(manifest.routes.some((route) => route.path === "/iphone-15"), true);
  assert.equal(manifest.routes.some((route) => route.path === "/iphone-15-128gb-den"), false);
  assert.equal(manifest.routes.some((route) => route.outputPath === "iphone-15.html"), true);
  assert.equal(manifest.routes.some((route) => route.path === "/dien-thoai"), true);
  assert.equal(manifest.data.routesWritten, 6);
  assert.equal(dataManifest.routes.length, 6);
  assert.equal(dataManifest.routes.some((route) => route.dataPath === "/data/routes/iphone-15.json"), true);
  assert.equal(homeData.route.path, "/");
  assert.equal(productData.content.variants.length, 2);
  assert.equal(productData.runtime.dataUrl, "/data/routes/iphone-15.json");
});
