import assert from "node:assert/strict";
import test from "node:test";
import createWordPressWooCommerceAdapter from "../src/adapters/wordpressWooCommerce/wordpressWooCommerceAdapter.js";
import compile from "../src/core/compile.js";

test("WordPress WooCommerce adapter merges content and collections", async () => {
  const responses = new Map([
    ["/wp-json/wp/v2/pages", [{
      id: 1,
      slug: "gioi-thieu",
      title: { rendered: "Giới thiệu" },
      content: { rendered: "<p>Page</p>" },
      excerpt: { rendered: "" }
    }]],
    ["/wp-json/wp/v2/categories", [{
      count: 4,
      description: "Tin tức doanh nghiệp",
      id: 2,
      link: "https://example.com/category/tin-tuc/",
      name: "Tin tức",
      parent: 9,
      slug: "tin-tuc"
    }]],
    ["/wp-json/wp/v2/media", []],
    ["/wp-json/wp/v2/menus", [{
      id: 3,
      name: "Main"
    }]],
    ["/wp-json/wc/v3/products", [{
      id: 44,
      name: "Áo thun",
      slug: "ao-thun",
      price: "249000",
      categories: [{ id: 5, name: "Thời trang", slug: "thoi-trang" }],
      tags: [{ id: 6, name: "Sale", slug: "sale" }],
      images: []
    }]],
    ["/wp-json/wc/v3/products/categories", [{
      count: 8,
      description: "Sản phẩm thời trang",
      id: 5,
      image: {
        alt: "Ảnh thời trang",
        id: 99,
        name: "thoi-trang.jpg",
        src: "https://example.com/thoi-trang.jpg"
      },
      menu_order: 3,
      name: "Thời trang",
      parent: 2,
      slug: "thoi-trang"
    }]],
    ["/wp-json/wc/v3/products/tags", [{
      id: 6,
      name: "Sale",
      slug: "sale"
    }]]
  ]);
  const fetchImpl = async (url) => {
    const pathname = new URL(String(url)).pathname;

    return {
      ok: true,
      headers: new Headers({
        "x-wp-totalpages": "1"
      }),
      async json() {
        return responses.get(pathname) ?? [];
      },
      status: 200,
      statusText: "OK"
    };
  };
  const adapter = createWordPressWooCommerceAdapter({
    wordpress: {
      baseUrl: "https://example.com",
      contentTypes: ["pages"],
      includeMedia: true,
      includeMenus: true,
      taxonomies: ["categories"],
      fetchImpl
    },
    woocommerce: {
      baseUrl: "https://example.com",
      fetchImpl
    }
  });
  const [contents, collections] = await Promise.all([
    adapter.getContents(),
    adapter.getCollections()
  ]);

  assert.deepEqual(contents.map((content) => content.type), ["page", "product"]);
  assert.equal(collections.menus.length, 1);
  assert.equal(collections.productCategories[0].slug, "thoi-trang");
  assert.equal(collections.productTags[0].slug, "sale");
  assert.equal(collections.terms.find((term) => term.slug === "tin-tuc").parentId, 9);
  assert.equal(collections.terms.find((term) => term.slug === "tin-tuc").description, "Tin tức doanh nghiệp");
  assert.equal(collections.terms.find((term) => term.slug === "thoi-trang").parentId, 2);
  assert.equal(collections.terms.find((term) => term.slug === "thoi-trang").description, "Sản phẩm thời trang");
  assert.equal(collections.terms.find((term) => term.slug === "thoi-trang").image.sourceUrl, "https://example.com/thoi-trang.jpg");
  assert.equal(collections.terms.find((term) => term.slug === "thoi-trang").count, 8);
  assert.equal(collections.terms.find((term) => term.slug === "thoi-trang").menuOrder, 3);
  assert.deepEqual(collections.terms.map((term) => term.taxonomy), [
    "category",
    "product_cat",
    "product_tag"
  ]);
});

test("compile supports wordpressWooCommerce adapter config", async () => {
  const fetchImpl = async (url) => {
    const pathname = new URL(String(url)).pathname;
    const collections = {
      "/wp-json/wp/v2/pages": [{
        id: 1,
        slug: "home",
        title: { rendered: "Home" },
        content: { rendered: "<p>Home content</p>" },
        excerpt: { rendered: "" }
      }],
      "/wp-json/wc/v3/products": [{
        id: 44,
        name: "Áo thun",
        slug: "ao-thun",
        price: "249000",
        categories: [],
        tags: [],
        images: []
      }]
    };

    return {
      ok: true,
      headers: new Headers({
        "x-wp-totalpages": "1"
      }),
      async json() {
        return collections[pathname] ?? [];
      },
      status: 200,
      statusText: "OK"
    };
  };
  const result = await compile({
    name: "Real Shop",
    homepage: "home",
    adapter: {
      type: "wordpressWooCommerce",
      wordpress: {
        baseUrl: "https://example.com",
        contentTypes: ["pages"],
        fetchImpl
      },
      woocommerce: {
        baseUrl: "https://example.com",
        includeCategories: false,
        includeTags: false,
        fetchImpl
      }
    },
    site: {
      url: "https://example.com"
    },
    theme: {
      components: "./examples/basic-shop/theme/components/index.js",
      layout: "./examples/basic-shop/theme/layout.js"
    }
  }, {
    projectDir: process.cwd()
  });

  assert.deepEqual(result.routes.map((route) => route.path), ["/", "/ao-thun"]);
});
