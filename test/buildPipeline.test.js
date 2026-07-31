import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import buildSite from "../framework/src/builder/buildSite.js";
import compile from "../framework/src/core/compile.js";
import loadConfig from "../framework/src/core/loadConfig.js";

test("build pipeline writes html files and manifest", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-build-"));
  const config = await loadConfig("fixtures/basic-shop");
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
  const contentManifest = JSON.parse(await readFile(path.join(outputDir, "data", "content", "manifest.json"), "utf8"));
  const homeFragment = await readFile(path.join(outputDir, "fragments", "index", "main.html"), "utf8");
  const productFragment = await readFile(path.join(outputDir, "fragments", "iphone-15", "main.html"), "utf8");
  const productServeAlias = await readFile(path.join(outputDir, "iphone-15", "index.html"), "utf8");
  const enhancedNavigation = await readFile(path.join(outputDir, "wpsc-enhanced-navigation.js"), "utf8");
  const adminHtml = await readFile(path.join(outputDir, "admin.html"), "utf8");
  const adminScript = await readFile(path.join(outputDir, "admin-assets", "admin.js"), "utf8");
  const adminConfig = JSON.parse(await readFile(path.join(outputDir, "admin-assets", "config.json"), "utf8"));

  assert.equal(result.pagesWritten, 7);
  assert.equal(result.totalPages, 7);
  assert.equal(result.fullBuild, true);
  assert.equal(manifest.pages, 7);
  assert.equal(manifest.incremental.fullBuild, true);
  assert.equal(manifest.routes.some((route) => route.path === "/iphone-15"), true);
  assert.equal(manifest.routes.some((route) => route.path === "/iphone-15-128gb-den"), false);
  assert.equal(manifest.routes.some((route) => route.outputPath === "iphone-15.html"), true);
  assert.equal(manifest.routes.some((route) => route.path === "/dien-thoai"), true);
  assert.equal(manifest.data.routesWritten, 7);
  assert.equal(manifest.data.contentFilesWritten > 0, true);
  assert.equal(manifest.fragments.written, 7);
  assert.equal(dataManifest.routes.length, 7);
  assert.equal(dataManifest.routes.some((route) => route.dataPath === "/data/routes/iphone-15.json"), true);
  assert.equal(contentManifest.groups.products >= 1, true);
  assert.equal(contentManifest.groups.pages >= 1, true);
  assert.equal(homeData.route.path, "/");
  assert.equal(homeData.runtime.fragmentUrl, "/fragments/index/main.html");
  assert.equal(productData.content.variants.length, 2);
  assert.equal(productData.runtime.dataUrl, "/data/routes/iphone-15.json");
  assert.equal(productData.runtime.fragmentUrl, "/fragments/iphone-15/main.html");
  assert.match(homeFragment, /^<main\b/);
  assert.match(productFragment, /^<main\b/);
  assert.match(productServeAlias, /data-template-scope="contentType:product"/);
  assert.match(enhancedNavigation, /wpsc:navigation/);
  assert.match(enhancedNavigation, /synchronizeRuntimeCart/);
  assert.match(enhancedNavigation, /fetch\("\/api\/cart\/items"/);
  assert.equal(result.adminApp.outputPath, "admin.html");
  assert.match(adminHtml, /data-login-form/);
  assert.match(adminHtml, /data-logout/);
  assert.match(adminHtml, /data-route-list/);
  assert.match(adminHtml, /data-stat-routes/);
  assert.match(adminScript, /wpsc_admin_session/);
  assert.match(adminScript, /fetchJson\("\/data\/manifest\.json"\)/);
  assert.match(adminScript, /data-route-path/);
  assert.equal(adminConfig.auth.tokenEnv, "WPSC_BUILDER_TOKEN");
});
