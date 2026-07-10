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
    assert.deepEqual(assetManifest.stats, {
      cached: 0,
      downloaded: 1,
      total: 1
    });
    assert.equal(assetEntry.cached, false);
    assert.equal(assetEntry.optimization.format, "webp");
    assert.equal(assetEntry.optimization.status, "planned");
    assert.match(assetEntry.optimization.webpOutputPath, /\.webp$/);
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

test("incremental build processes assets for changed pages only", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-assets-incremental-"));
  const changedUrl = "https://example.test/media/changed.jpg";
  const unchangedUrl = "https://example.test/media/unchanged.jpg";
  const sitePlan = createSitePlan(changedUrl, {
    extraPages: [{
      imageUrl: unchangedUrl,
      outputPath: "unchanged.html",
      path: "/unchanged",
      slug: "unchanged"
    }]
  });
  const originalFetch = globalThis.fetch;
  const requestedUrls = [];

  try {
    globalThis.fetch = async (url) => {
      requestedUrls.push(String(url));

      return {
        ok: true,
        async arrayBuffer() {
          return Buffer.from("fake image");
        }
      };
    };

    const result = await buildSite(sitePlan, {
      incremental: {
        changedRoutes: ["/product"],
        fullBuild: false
      },
      outputDir
    });

    assert.equal(result.pagesWritten, 1);
    assert.equal(result.assetsDownloaded, 1);
    assert.deepEqual(requestedUrls, [changedUrl]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function createSitePlan(imageUrl, options = {}) {
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
      },
      ...(options.extraPages ?? []).map((page) => {
        const extraContent = {
          id: `product-${page.slug}`,
          type: "product",
          slug: page.slug,
          title: page.slug,
          data: {
            image: page.imageUrl
          }
        };

        return {
          route: {
            path: page.path,
            outputPath: page.outputPath,
            content: extraContent
          },
          html: `<img src="${page.imageUrl}" alt="">`
        };
      })
    ],
    routes: []
  };
}
