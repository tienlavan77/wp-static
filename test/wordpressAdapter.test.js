import assert from "node:assert/strict";
import test from "node:test";
import normalizeWordPressContent from "../src/adapters/wordpress/normalizeWordPressContent.js";
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

test("createWordPressAdapter requires baseUrl", () => {
  assert.throws(
    () => createWordPressAdapter(),
    /WordPress adapter option "baseUrl" is required/
  );
});
