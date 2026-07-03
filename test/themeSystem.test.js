import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import buildSite from "../src/builder/buildSite.js";
import compile from "../src/core/compile.js";
import loadConfig from "../src/core/loadConfig.js";

test("theme resolver supports content type layouts, components, metadata, and assets", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-theme-"));
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
    publicDir: config._paths.publicDir,
    site: config.site,
    themeAssetsDir: sitePlan.theme.assetsDir
  });
  const productHtml = await readFile(path.join(outputDir, "iphone-15.html"), "utf8");
  const pageHtml = await readFile(path.join(outputDir, "gioi-thieu.html"), "utf8");
  const themeAsset = await readFile(path.join(outputDir, "theme", "theme.css"), "utf8");
  const manifest = JSON.parse(await readFile(result.manifestPath, "utf8"));

  assert.match(productHtml, /class="product-view"/);
  assert.match(productHtml, /product/);
  assert.match(pageHtml, /class="page-view"/);
  assert.match(themeAsset, /theme-marker/);
  assert.equal(result.copiedThemeAssets, true);
  assert.equal(manifest.assets.copiedThemeAssets, true);
  assert.equal(manifest.theme.name, "Basic Commerce Theme");
  assert.equal(manifest.theme.version, "0.1.0");
});

test("theme resolver falls back to theme.layout when content type layout is missing", async () => {
  const config = await loadConfig("examples/basic-shop");
  const testConfig = {
    ...config,
    theme: {
      ...config.theme,
      layouts: {
        product: config.theme.layouts.product
      }
    },
    _paths: {
      ...config._paths,
      themeLayouts: {
        product: config._paths.themeLayouts.product
      }
    }
  };
  const sitePlan = await compile(testConfig);
  const homepage = sitePlan.pages.find((page) => page.route.path === "/");

  assert.match(homepage.html, /class="fallback-view"/);
});
