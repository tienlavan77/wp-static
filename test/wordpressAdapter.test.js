import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import normalizeWordPressContent from "../src/adapters/wordpress/normalizeWordPressContent.js";
import normalizeRankMathSeo from "../src/adapters/wordpress/normalizeRankMathSeo.js";
import createWordPressRepository from "../src/adapters/wordpress/wordpressRepository.js";
import createWordPressAdapter from "../src/adapters/wordpress/wordpressAdapter.js";

test("normalizeWordPressContent maps raw WordPress page into content input", () => {
  const content = normalizeWordPressContent({
    id: 12,
    slug: "gioi-thieu",
    title: { rendered: "Giới <strong>thiệu</strong>" },
    excerpt: { rendered: "<p>Xin chào</p>" },
    content: { rendered: "<p>Nội dung</p>" },
    date: "2026-07-03",
    link: "https://example.com/gioi-thieu"
  });

  assert.equal(content.id, "page-12");
  assert.equal(content.slug, "gioi-thieu");
  assert.equal(content.title, "Giới thiệu");
  assert.equal(content.data.excerpt, "Xin chào");
});

test("normalizeWordPressContent maps ACF, featured media, terms, and Rank Math SEO", async () => {
  const rawPage = JSON.parse(await readFile("test/fixtures/wordpress/page-with-rankmath.json", "utf8"));
  const content = normalizeWordPressContent(rawPage, "page");

  assert.equal(content.data.acf.hero_title, "Hero ACF");
  assert.equal(content.data.featuredImage.sourceUrl, "https://example.com/image.jpg");
  assert.equal(content.data.terms[0].slug, "tin-tuc");
  assert.equal(content.seo.title, "SEO Title");
  assert.deepEqual(content.seo.robots, ["index", "follow"]);
  assert.equal(content.seo.openGraph.image, "https://example.com/og.jpg");
});

test("normalizeRankMathSeo returns a normalized SEO object", () => {
  const seo = normalizeRankMathSeo({
    meta: {
      rank_math_title: "Title",
      rank_math_description: "Description"
    }
  });

  assert.equal(seo.title, "Title");
  assert.equal(seo.description, "Description");
});

test("WordPress repository fetches pages, posts, and custom post types", async () => {
  const calls = [];
  const client = {
    async getCollection(pathname) {
      calls.push(pathname);

      return [{
        id: calls.length,
        slug: `item-${calls.length}`,
        title: { rendered: `Item ${calls.length}` },
        content: { rendered: "" },
        excerpt: { rendered: "" }
      }];
    }
  };
  const repository = createWordPressRepository(client, {
    contentTypes: ["pages", "posts"],
    customPostTypes: ["du-an"]
  });
  const contents = await repository.getContents();

  assert.deepEqual(calls, [
    "/wp-json/wp/v2/pages",
    "/wp-json/wp/v2/posts",
    "/wp-json/wp/v2/du-an"
  ]);
  assert.equal(contents.length, 3);
  assert.equal(contents[2].type, "du-an");
});

test("WordPress repository normalizes collection taxonomy names", async () => {
  const client = {
    async getCollection(pathname) {
      return [{
        id: pathname.endsWith("categories") ? 1 : 2,
        name: pathname.endsWith("categories") ? "Tin tức" : "Khuyến mãi",
        parent: 0,
        slug: pathname.endsWith("categories") ? "tin-tuc" : "khuyen-mai"
      }];
    }
  };
  const repository = createWordPressRepository(client, {
    taxonomies: ["categories", "tags"]
  });
  const terms = await repository.getTerms();

  assert.deepEqual(terms.map((term) => `${term.taxonomy}:${term.slug}`), [
    "category:tin-tuc",
    "post_tag:khuyen-mai"
  ]);
});

test("WordPress client tolerates PHP warnings before JSON", async () => {
  const { default: createWordPressClient } = await import("../src/adapters/wordpress/wordpressClient.js");
  const client = createWordPressClient({
    baseUrl: "https://example.com",
    fetchImpl: async () => ({
      ok: true,
      headers: new Headers({
        "x-wp-totalpages": "1"
      }),
      async text() {
        return '<br />\n<b>Warning</b>: plugin warning<br />\n[{"id":1,"slug":"home"}]';
      }
    })
  });
  const items = await client.getCollection("/wp-json/wp/v2/pages");

  assert.deepEqual(items, [{ id: 1, slug: "home" }]);
});

test("createWordPressAdapter requires baseUrl", () => {
  assert.throws(
    () => createWordPressAdapter(),
    /WordPress adapter option "baseUrl" is required/
  );
});
