import assert from "node:assert/strict";
import test from "node:test";
import productLayout from "../themes/storefront/layouts/product.js";

const html = (strings, ...values) => strings.reduce((result, part, index) => result + part + (values[index] ?? ""), "");
html.raw = (value) => value;

test("storefront product actions use the WooCommerce provider ID", () => {
  const rendered = productLayout({
    components: { price: (value) => String(value) },
    content: {
      data: { price: 120000, woocommerceProductId: "44" },
      id: "product-44",
      slug: "hop-giay",
      title: "Hộp giấy",
      type: "product"
    },
    graph: { contents: { items: [] }, terms: { items: [] } },
    html,
    route: { path: "/hop-giay" }
  });

  assert.match(rendered, /data-add-to-cart[^>]*data-product-id="44"/);
  assert.doesNotMatch(rendered, /data-add-to-cart[^>]*data-product-id="product-44"/);
});

