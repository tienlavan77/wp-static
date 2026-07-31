import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import normalizeWordPressMedia from "../framework/src/adapters/wordpress/normalizeWordPressMedia.js";
import buildSite from "../framework/src/builder/buildSite.js";

test("WordPress media normalization retains dimensions, source reference, and responsive variants", () => {
  const media = normalizeWordPressMedia({
    alt_text: "Product image",
    caption: { rendered: "<p>Product caption</p>" },
    date: "2026-07-30T08:00:00",
    id: 42,
    media_details: {
      file: "2026/07/product.jpg",
      height: 1200,
      sizes: {
        medium: { height: 300, mime_type: "image/jpeg", source_url: "https://cms.example.test/product-300.jpg", width: 300 },
        large: { height: 800, mime_type: "image/jpeg", source_url: "https://cms.example.test/product-1024.jpg", width: 1024 }
      },
      width: 1800
    },
    mime_type: "image/jpeg",
    modified: "2026-07-30T09:00:00",
    source_url: "https://cms.example.test/product.jpg",
    title: { rendered: "Product" }
  });

  assert.equal(media.id, "42");
  assert.equal(media.width, 1800);
  assert.equal(media.height, 1200);
  assert.equal(media.metadata.file, "2026/07/product.jpg");
  assert.deepEqual(media.responsive.map((item) => item.name), ["medium", "large"]);
});

test("build writes a site-scoped media manifest with static asset references", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-media-manifest-"));
  const sourceUrl = "https://cms.example.test/product.jpg";
  const responsiveUrl = "https://cms.example.test/product-300.jpg";
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => Buffer.from("image") });
    const result = await buildSite(createSitePlan(sourceUrl, responsiveUrl), { outputDir, siteId: "site-a" });
    const manifest = JSON.parse(await readFile(result.mediaManifest.manifestPath, "utf8"));

    assert.equal(manifest.schema, "wpsc.media-manifest");
    assert.equal(manifest.schemaVersion, 1);
    assert.equal(manifest.siteId, "site-a");
    assert.equal(manifest.media.length, 1);
    assert.match(manifest.media[0].publicUrl, /^\/assets\/media\//);
    assert.match(manifest.media[0].responsive[0].publicUrl, /^\/assets\/media\//);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function createSitePlan(sourceUrl, responsiveUrl) {
  const content = { data: { featuredImage: { sourceUrl } }, id: "page-home", slug: "home", title: "Home", type: "page" };
  return {
    graph: {
      contents: { items: [content] },
      media: { items: [{ alt: "Product", height: 900, id: "42", metadata: { sourceId: 42 }, mimeType: "image/jpeg", provider: "wordpress", responsive: [{ height: 300, mimeType: "image/jpeg", name: "medium", sourceUrl: responsiveUrl, width: 300 }], sourceUrl, title: "Product", width: 1200 }] },
      menus: { items: [] },
      terms: { items: [] }
    },
    pages: [{ html: `<img src="${sourceUrl}" alt="Product">`, route: { content, outputPath: "index.html", path: "/" } }],
    routes: [{ content, outputPath: "index.html", path: "/" }]
  };
}
