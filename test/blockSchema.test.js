import assert from "node:assert/strict";
import test from "node:test";
import createBlockRegistry from "../src/blocks/createBlockRegistry.js";
import createBlockSchema from "../src/blocks/createBlockSchema.js";
import coreCommerceBlocks, { archiveLinksBlock, productPriceBlock } from "../src/blocks/core/commerceBlocks.js";
import renderBlock from "../src/blocks/renderBlock.js";
import resolveBlockBindings from "../src/blocks/resolveBlockBindings.js";
import validateBlockProps from "../src/blocks/validateBlockProps.js";
import html from "../src/renderer/html.js";

test("createBlockSchema normalizes block metadata and schemas", () => {
  const block = createBlockSchema({
    name: "core/example",
    label: "Example",
    props: {
      title: {
        required: true,
        type: "string"
      }
    },
    bindings: {
      headline: {
        path: "data.headline",
        source: "content"
      }
    }
  });

  assert.equal(block.name, "core/example");
  assert.equal(block.category, "general");
  assert.equal(block.props.title.required, true);
  assert.equal(block.bindings.headline.source, "content");
});

test("validateBlockProps applies defaults and reports invalid props", () => {
  const block = createBlockSchema({
    name: "core/button",
    label: "Button",
    props: {
      label: {
        required: true,
        type: "string"
      },
      newTab: {
        default: false,
        type: "boolean"
      }
    }
  });

  assert.deepEqual(validateBlockProps(block, {
    label: "Buy"
  }), {
    errors: [],
    ok: true,
    props: {
      label: "Buy",
      newTab: false
    }
  });
  assert.equal(validateBlockProps(block, {
    label: 123
  }).ok, false);
});

test("resolveBlockBindings reads context data with fallbacks", () => {
  const values = resolveBlockBindings(archiveLinksBlock, {
    content: {
      data: {
        archiveLinks: [
          {
            href: "/dien-thoai",
            label: "Điện thoại"
          }
        ]
      }
    }
  });

  assert.equal(values.links[0].href, "/dien-thoai");
});

test("core commerce blocks render bound content", () => {
  const price = renderBlock(productPriceBlock, {}, {
    content: {
      data: {
        price: 19900000
      }
    },
    html
  });
  const archives = renderBlock(archiveLinksBlock, {}, {
    content: {
      data: {
        archiveLinks: [
          {
            href: "/dien-thoai",
            label: "Điện thoại"
          }
        ]
      }
    },
    html
  });

  assert.match(price.html, /19\.900\.000/);
  assert.match(archives.html, /href="\/dien-thoai"/);
});

test("createBlockRegistry exposes core commerce blocks", () => {
  const registry = createBlockRegistry(coreCommerceBlocks);

  assert.equal(registry.has("commerce/product-price"), true);
  assert.equal(registry.get("commerce/archive-links").label, "Archive Links");
  assert.equal(registry.all().length >= 4, true);
});
