import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import normalizeWordPressContent from "../framework/src/adapters/wordpress/normalizeWordPressContent.js";
import normalizeRankMathSeo from "../framework/src/adapters/wordpress/normalizeRankMathSeo.js";
import createWordPressRepository from "../framework/src/adapters/wordpress/wordpressRepository.js";
import createWordPressAdapter from "../framework/src/adapters/wordpress/wordpressAdapter.js";

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

test("normalizeWordPressContent exposes an embedded author through the stable content shape", () => {
  const content = normalizeWordPressContent({
    _embedded: {
      author: [{
        avatar_urls: { "96": "https://example.com/avatar.jpg" },
        id: 8,
        link: "https://example.com/author/editor",
        name: "Editor",
        slug: "editor"
      }]
    },
    content: { rendered: "" },
    excerpt: { rendered: "" },
    id: 12,
    slug: "about",
    title: { rendered: "About" }
  });

  assert.deepEqual(content.data.author, {
    avatarUrl: "https://example.com/avatar.jpg",
    description: "",
    id: "8",
    name: "Editor",
    slug: "editor",
    url: "https://example.com/author/editor"
  });
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

test("WordPress adapter returns a versioned provider contract for pages, posts, terms, and authors", async () => {
  const client = {
    async getCollection(pathname) {
      if (pathname.endsWith("users")) {
        return [{ id: 3, name: "Admin", slug: "admin" }];
      }
      if (pathname.endsWith("categories")) {
        return [{ id: 5, name: "News", slug: "news" }];
      }
      if (pathname.endsWith("tags")) return [];
      return [{ content: { rendered: "" }, excerpt: { rendered: "" }, id: pathname.endsWith("pages") ? 1 : 2, slug: "item", title: { rendered: "Item" } }];
    }
  };
  const adapter = createWordPressAdapter({
    baseUrl: "https://cms.example.test",
    client
  });
  const contract = await adapter.getContentContract();

  assert.equal(contract.schema, "wpsc.wordpress-content");
  assert.equal(contract.schemaVersion, 1);
  assert.equal(contract.provider, "wordpress");
  assert.deepEqual(contract.contents.map((content) => content.type), ["page", "post"]);
  assert.deepEqual(contract.terms.map((term) => term.taxonomy), ["category"]);
  assert.deepEqual(contract.authors, [{
    avatarUrl: null,
    description: "",
    id: "3",
    name: "Admin",
    slug: "admin",
    url: null
  }]);
  assert.equal(Object.isFrozen(contract), true);
});

test("WordPress client tolerates PHP warnings before JSON", async () => {
  const { default: createWordPressClient } = await import("../framework/src/adapters/wordpress/wordpressClient.js");
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
