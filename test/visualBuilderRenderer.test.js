import assert from "node:assert/strict";
import test from "node:test";
import createBlockRegistry from "../src/blocks/createBlockRegistry.js";
import coreCommerceBlocks from "../src/blocks/core/commerceBlocks.js";
import renderLayout from "../src/visual-builder/renderLayout.js";

test("renderLayout renders layout JSON to static HTML", () => {
  const result = renderLayout({
    contentTypes: ["page"],
    id: "home",
    sections: [{
      children: [{
        blockName: "core/heading",
        id: "title",
        props: {
          text: "Xin chào",
          level: 1
        },
        type: "block"
      }],
      id: "main"
    }]
  });

  assert.equal(result.errors.length, 0);
  assert.match(result.html, /<section/);
  assert.match(result.html, /<h1>Xin chào<\/h1>/);
});

test("renderLayout binds block props to content data", () => {
  const result = renderLayout({
    contentTypes: ["page"],
    id: "bound",
    sections: [{
      children: [{
        blockName: "core/heading",
        bindings: {
          text: {
            path: "data.title",
            source: "content"
          }
        },
        id: "title",
        type: "block"
      }],
      id: "main"
    }]
  }, {
    content: {
      title: "Giới thiệu",
      type: "page"
    }
  });

  assert.equal(result.errors.length, 0);
  assert.match(result.html, /<h2>Giới thiệu<\/h2>/);
});

test("renderLayout supports product commerce blocks", () => {
  const result = renderLayout({
    contentTypes: ["product"],
    id: "product",
    sections: [{
      children: [{
        blockName: "commerce/product-price",
        id: "price",
        type: "block"
      }],
      id: "summary"
    }]
  }, {
    content: {
      data: {
        price: 19900000
      },
      type: "product"
    }
  });

  assert.equal(result.errors.length, 0);
  assert.match(result.html, /19\.900\.000/);
});

test("renderLayout supports taxonomy archive blocks", () => {
  const result = renderLayout({
    contentTypes: ["product_cat"],
    id: "archive",
    sections: [{
      children: [{
        blockName: "commerce/archive-links",
        id: "links",
        type: "block"
      }],
      id: "main"
    }]
  }, {
    content: {
      data: {
        archiveLinks: [{
          href: "/dien-thoai",
          label: "Điện thoại"
        }]
      },
      taxonomy: "product_cat",
      type: "archive"
    }
  });

  assert.equal(result.errors.length, 0);
  assert.match(result.html, /href="\/dien-thoai"/);
});

test("renderLayout returns safe fallbacks for missing blocks", () => {
  const result = renderLayout({
    contentTypes: ["page"],
    id: "missing",
    sections: [{
      children: [{
        blockName: "missing/block",
        id: "missing-block",
        type: "block"
      }],
      id: "main"
    }]
  }, {
    registry: createBlockRegistry(coreCommerceBlocks),
    showFallbacks: true
  });

  assert.equal(result.errors.length, 1);
  assert.match(result.html, /wpsc-builder-fallback/);
});
