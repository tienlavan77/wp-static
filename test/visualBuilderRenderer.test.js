import assert from "node:assert/strict";
import test from "node:test";
import createBlockRegistry from "../framework/src/builder/blocks/createBlockRegistry.js";
import coreCommerceBlocks from "../framework/src/builder/blocks/core/commerceBlocks.js";
import renderLayout from "../framework/src/builder/visual-builder/renderLayout.js";

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

test("renderLayout supports row and column layout sections", () => {
  const result = renderLayout({
    contentTypes: ["page"],
    id: "row-layout",
    sections: [{
      children: [{
        children: [{
          children: [{
            blockName: "core/heading",
            id: "left-heading",
            props: {
              text: "Cột trái"
            },
            type: "block"
          }],
          id: "left",
          settings: {
            kind: "column"
          },
          type: "section"
        }, {
          children: [{
            blockName: "core/heading",
            id: "right-heading",
            props: {
              text: "Cột phải"
            },
            type: "block"
          }],
          id: "right",
          settings: {
            kind: "column"
          },
          type: "section"
        }],
        id: "row",
        settings: {
          gap: "20px",
          kind: "row"
        },
        type: "section"
      }],
      id: "main"
    }]
  });

  assert.equal(result.errors.length, 0);
  assert.match(result.html, /class="wpsc-row"/);
  assert.match(result.html, /--wpsc-row-columns: 2/);
  assert.match(result.html, /--wpsc-row-gap: 20px/);
  assert.match(result.html, /wpsc-row__inner/);
  assert.match(result.html, /class="wpsc-column"/);
  assert.match(result.html, /Cột trái/);
  assert.match(result.html, /Cột phải/);
});

test("renderLayout applies layout style settings and custom classes", () => {
  const result = renderLayout({
    contentTypes: ["page"],
    id: "styled-layout",
    sections: [{
      children: [{
        children: [{
          children: [{
            blockName: "core/heading",
            id: "title",
            props: {
              text: "Styled"
            },
            settings: {
              background: "#ffffff",
              className: "custom-heading",
              padding: "12px"
            },
            type: "block"
          }],
          id: "column",
          settings: {
            kind: "column"
          },
          type: "section"
        }],
        id: "row",
        settings: {
          background: "#f5f5f5",
          className: "hero-row",
          contentMaxWidth: "1200px",
          contentWidth: "90%",
          gap: "24px",
          kind: "row"
        },
        type: "section"
      }],
      id: "main"
    }]
  });

  assert.equal(result.errors.length, 0);
  assert.match(result.html, /class="wpsc-row hero-row"/);
  assert.match(result.html, /background: #f5f5f5/);
  assert.match(result.html, /--wpsc-row-content-width: 90%/);
  assert.match(result.html, /--wpsc-row-content-max-width: 1200px/);
  assert.match(result.html, /class="wpsc-block custom-heading"/);
  assert.match(result.html, /padding: 12px/);
});

test("renderLayout supports featured product list blocks", () => {
  const result = renderLayout({
    contentTypes: ["home"],
    id: "home",
    sections: [{
      children: [{
        blockName: "commerce/product-list",
        id: "products",
        type: "block"
      }],
      id: "main"
    }]
  }, {
    content: {
      data: {
        featuredProductIds: ["product-iphone-15"]
      },
      type: "page"
    },
    graph: {
      findContentById(id) {
        return id === "product-iphone-15"
          ? {
            data: {
              description: "Điện thoại Apple",
              price: 19900000
            },
            id,
            slug: "iphone-15",
            title: "iPhone 15",
            type: "product"
          }
          : null;
      }
    }
  });

  assert.equal(result.errors.length, 0);
  assert.match(result.html, /wpsc-product-list/);
  assert.match(result.html, /href="\/iphone-15"/);
  assert.match(result.html, /19\.900\.000/);
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
