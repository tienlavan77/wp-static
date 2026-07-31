import assert from "node:assert/strict";
import test from "node:test";
import createBlockRegistry from "../framework/src/builder/blocks/createBlockRegistry.js";
import createBlockSchema from "../framework/src/builder/blocks/createBlockSchema.js";
import coreCommerceBlocks, {
  archiveLinksBlock,
  darkModeToggleBlock,
  productPriceBlock,
  siteHeaderBlock,
  siteLogoBlock,
  siteNavBlock
} from "../framework/src/builder/blocks/core/commerceBlocks.js";
import renderBlock from "../framework/src/builder/blocks/renderBlock.js";
import resolveBlockBindings from "../framework/src/builder/blocks/resolveBlockBindings.js";
import validateBlockProps from "../framework/src/builder/blocks/validateBlockProps.js";
import html from "../framework/src/builder/renderer/html.js";

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

test("site blocks render reusable header pieces", () => {
  const logo = renderBlock(siteLogoBlock, {}, {
    html,
    site: {
      title: "Tin Sinh Phát"
    }
  });
  const nav = renderBlock(siteNavBlock, {
    props: {
      items: [{
        href: "/",
        label: "Trang chủ"
      }, {
        href: "/lien-he",
        label: "Liên hệ"
      }]
    }
  }, {
    html
  });
  const toggle = renderBlock(darkModeToggleBlock, {}, {
    html
  });
  const header = renderBlock(siteHeaderBlock, {
    props: {
      logoText: "Tin Sinh Phát",
      navItems: [{
        href: "/",
        label: "Trang chủ"
      }],
      rows: [{
        columns: [{
          children: [{
            blockName: "site/logo",
            props: {
              href: "/",
              text: "Tin Sinh Phát"
            }
          }]
        }, {
          children: [{
            blockName: "site/nav",
            props: {
              items: [{
                href: "/",
                label: "Trang chủ"
              }]
            }
          }]
        }]
      }],
      showDarkMode: true
    }
  }, {
    html
  });

  assert.match(logo.html, /Tin Sinh Phát/);
  assert.match(nav.html, /href="\/lien-he"/);
  assert.match(toggle.html, /class="theme-toggle"/);
  assert.match(toggle.html, /localStorage\.setItem\("wpsc-theme"/);
  assert.match(header.html, /class="wpsc-site-header"/);
  assert.match(header.html, /class="wpsc-site-header__row"/);
  assert.match(header.html, /class="wpsc-site-header__column"/);
  assert.match(header.html, /href="\/"/);
});

test("createBlockRegistry exposes core commerce blocks", () => {
  const registry = createBlockRegistry(coreCommerceBlocks);

  assert.equal(registry.has("commerce/product-price"), true);
  assert.equal(registry.get("commerce/archive-links").label, "Archive Links");
  assert.equal(registry.has("site/logo"), true);
  assert.equal(registry.has("site/nav"), true);
  assert.equal(registry.has("site/dark-mode-toggle"), true);
  assert.equal(registry.has("site/header"), true);
  assert.equal(registry.all().length >= 8, true);
});
