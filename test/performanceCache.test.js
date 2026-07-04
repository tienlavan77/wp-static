import assert from "node:assert/strict";
import { cp, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import buildSite from "../src/builder/buildSite.js";
import compile from "../src/core/compile.js";
import buildProjectOnce from "../src/dev-server/buildProjectOnce.js";

test("buildProjectOnce reuses content and route render caches", async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-cache-"));
  await cp("examples/basic-shop", projectDir, {
    recursive: true
  });

  const first = await buildProjectOnce(projectDir);
  const second = await buildProjectOnce(projectDir);
  const manifest = JSON.parse(await readFile(second.result.manifestPath, "utf8"));

  assert.equal(first.sitePlan.cache.contentCacheHit, false);
  assert.equal(second.sitePlan.cache.contentCacheHit, true);
  assert.equal(second.sitePlan.cache.collectionCacheHit, true);
  assert.equal(second.sitePlan.cache.routeRenderCacheHits, 6);
  assert.equal(second.sitePlan.cache.routeRenderCacheMisses, 0);
  assert.equal(manifest.cache.routeRenderCacheHits, 6);
});

test("large catalog compile supports parallel rendering and render cache hits", async () => {
  const projectDir = await createLargeCatalogProject(80);
  const config = {
    _paths: {
      outputDir: path.join(projectDir, "dist"),
      projectDir,
      themeLayout: path.join(projectDir, "theme", "layout.js"),
      themeLayouts: {}
    },
    adapter: {
      source: "./content.json",
      type: "mock"
    },
    homepage: "home",
    name: "Large Catalog",
    outputDir: "./dist",
    site: {
      url: "https://example.com"
    },
    theme: {
      layout: "./theme/layout.js"
    }
  };
  const cacheDir = path.join(projectDir, ".wpsc", "cache");
  const first = await compile(config, {
    cacheDir,
    projectDir,
    renderConcurrency: 8
  });
  const second = await compile(config, {
    cacheDir,
    projectDir,
    renderConcurrency: 8
  });

  assert.equal(first.pages.length, 81);
  assert.equal(first.cache.routeRenderCacheMisses, 81);
  assert.equal(second.cache.contentCacheHit, true);
  assert.equal(second.cache.routeRenderCacheHits, 81);
});

test("build manifest records asset cache stats", async () => {
  const projectDir = await createLargeCatalogProject(1);
  const sitePlan = await compile({
    _paths: {
      outputDir: path.join(projectDir, "dist"),
      projectDir,
      themeLayout: path.join(projectDir, "theme", "layout.js"),
      themeLayouts: {}
    },
    adapter: {
      source: "./content.json",
      type: "mock"
    },
    homepage: "home",
    name: "Asset Stats",
    outputDir: "./dist",
    site: {},
    theme: {
      layout: "./theme/layout.js"
    }
  }, {
    cacheDir: path.join(projectDir, ".wpsc", "cache"),
    projectDir
  });
  const result = await buildSite(sitePlan, {
    outputDir: path.join(projectDir, "dist")
  });
  const manifest = JSON.parse(await readFile(result.manifestPath, "utf8"));

  assert.deepEqual(result.assetStats, {
    cached: 0,
    downloaded: 0,
    total: 0
  });
  assert.deepEqual(manifest.assets.stats, result.assetStats);
});

async function createLargeCatalogProject(productCount) {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-large-"));
  const contents = [
    {
      data: {
        headline: "Home"
      },
      domain: "shop",
      id: "page-home",
      slug: "home",
      title: "Home",
      type: "page"
    },
    ...Array.from({ length: productCount }, (_, index) => ({
      data: {
        price: index + 1
      },
      domain: "shop",
      id: `product-${index + 1}`,
      slug: `product-${index + 1}`,
      title: `Product ${index + 1}`,
      type: "product"
    }))
  ];

  await mkdir(path.join(projectDir, "theme"), { recursive: true });
  await writeFile(path.join(projectDir, "content.json"), `${JSON.stringify(contents, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(projectDir, "theme", "layout.js"),
    "export default ({ content, html }) => html`<main><h1>${content.title}</h1></main>`;\n",
    "utf8"
  );

  return projectDir;
}
