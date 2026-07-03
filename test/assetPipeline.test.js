import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import buildSite from "../src/builder/buildSite.js";
import processAssetPipeline from "../src/assets/processAssetPipeline.js";

test("asset pipeline downloads, caches, manifests, and rewrites remote images", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-assets-"));
  const imageUrl = "https://example.test/media/product.jpg";
  const sitePlan = createSitePlan(imageUrl);
  const originalFetch = globalThis.fetch;
  let requests = 0;

  try {
    globalThis.fetch = async () => {
      requests += 1;

      return {
        ok: true,
        async arrayBuffer() {
          return Buffer.from("fake image");
        }
      };
    };

    const firstBuild = await buildSite(sitePlan, { outputDir });
    const html = await readFile(path.join(outputDir, "product.html"), "utf8");
    const assetManifest = JSON.parse(await readFile(firstBuild.assetManifestPath, "utf8"));
    const buildManifest = JSON.parse(await readFile(firstBuild.manifestPath, "utf8"));
    const assetEntry = assetManifest.assets[0];
    const assetBytes = await readFile(path.join(outputDir, assetEntry.outputPath));

    assert.equal(requests, 1);
    assert.equal(firstBuild.assetsDownloaded, 1);
    assert.match(html, /src="\/assets\/media\/product-/);
    assert.equal(assetManifest.assets.length, 1);
    assert.equal(assetEntry.cached, false);
    assert.equal(assetBytes.toString("utf8"), "fake image");
    assert.equal(buildManifest.assets.downloaded, 1);

    const secondBuild = await processAssetPipeline(sitePlan, {
      cacheDir: path.join(outputDir, ".wpsc", "cache", "assets"),
      outputDir
    });

    assert.equal(requests, 1);
    assert.equal(secondBuild.entries[0].cached, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function createSitePlan(imageUrl) {
  const content = {
    id: "product-1",
    type: "product",
    slug: "product",
    title: "Product",
    data: {
      image: imageUrl
    }
  };

  return {
    graph: {
      contents: {
        items: [content]
      },
      media: {
        items: [
          {
            id: 1,
            sourceUrl: imageUrl
          }
        ]
      },
      menus: {
        items: []
      },
      terms: {
        items: []
      }
    },
    pages: [
      {
        route: {
          path: "/product",
          outputPath: "product.html",
          content
        },
        html: `<img src="${imageUrl}" alt="">`
      }
    ],
    routes: []
  };
}
