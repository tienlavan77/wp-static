import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createContent from "../src/core/createContent.js";
import compile from "../src/core/compile.js";
import createArchiveRoutes from "../src/router/createArchiveRoutes.js";
import createRoutes from "../src/router/createRoutes.js";
import generateSitemap from "../src/seo/generateSitemap.js";

test("createArchiveRoutes creates default taxonomy archive routes", () => {
  const routes = createArchiveRoutes([
    product("product-iphone-15", "iphone-15", "dien-thoai"),
    product("product-ao-thun", "ao-thun", "thoi-trang")
  ], [
    term("dien-thoai", "Điện thoại", "product_cat"),
    term("thoi-trang", "Thời trang", "product_cat")
  ]);

  assert.deepEqual(routes.map((route) => route.path), [
    "/dien-thoai",
    "/thoi-trang"
  ]);
  assert.equal(routes[0].outputPath, "dien-thoai.html");
  assert.equal(routes[0].content.type, "archive:product_cat");
  assert.equal(routes[0].content.data.items[0].slug, "iphone-15");
});

test("createArchiveRoutes paginates archive items", () => {
  const routes = createArchiveRoutes([
    product("product-1", "product-1", "dien-thoai"),
    product("product-2", "product-2", "dien-thoai"),
    product("product-3", "product-3", "dien-thoai")
  ], [
    term("dien-thoai", "Điện thoại", "product_cat")
  ], {
    archives: {
      product_cat: {
        basePath: "danh-muc",
        contentTypes: ["product"],
        pageSize: 2,
        titlePrefix: "Danh mục"
      }
    }
  });

  assert.deepEqual(routes.map((route) => route.path), [
    "/danh-muc/dien-thoai",
    "/danh-muc/dien-thoai/page/2"
  ]);
  assert.equal(routes[1].outputPath, "danh-muc/dien-thoai/page/2.html");
  assert.equal(routes[1].content.title, "Danh mục: Điện thoại - Page 2");
  assert.equal(routes[1].content.data.pagination.pageCount, 2);
});

test("createRoutes includes archive routes and detects conflicts", () => {
  assert.throws(
    () => createRoutes([
      product("product-iphone-15", "iphone-15", "dien-thoai"),
      page("page-conflict", "dien-thoai")
    ], {
      homepage: "home",
      terms: [term("dien-thoai", "Điện thoại", "product_cat")]
    }),
    /Duplicate route "\/dien-thoai"/
  );
});

test("compile includes taxonomy archive pages in the site plan and sitemap", async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-archive-"));
  const source = "content.json";
  await writeFile(path.join(projectDir, source), JSON.stringify([
    page("page-home", "home"),
    product("product-iphone-15", "iphone-15", "dien-thoai")
  ]), "utf8");

  const sitePlan = await compile({
    name: "Archive Shop",
    homepage: "home",
    adapter: {
      source,
      type: "mock"
    },
    site: {
      url: "https://example.com"
    },
    theme: {
      components: path.resolve(process.cwd(), "examples/basic-shop/theme/components/index.js"),
      layout: path.resolve(process.cwd(), "examples/basic-shop/theme/layout.js")
    },
    outputDir: "./dist"
  }, {
    projectDir
  });

  const paths = sitePlan.routes.map((route) => route.path);
  const sitemap = generateSitemap(sitePlan, {
    site: {
      url: "https://example.com"
    }
  });

  assert.equal(paths.includes("/dien-thoai"), true);
  assert.match(sitemap, /<loc>https:\/\/example.com\/dien-thoai<\/loc>/);
});

function page(id, slug) {
  return createContent({
    id,
    type: "page",
    title: id,
    slug,
    domain: "shop",
    data: {}
  });
}

function product(id, slug, termSlug) {
  return createContent({
    id,
    type: "product",
    title: id,
    slug,
    domain: "shop",
    data: {
      terms: [
        term(termSlug, "Điện thoại", "product_cat")
      ]
    }
  });
}

function term(slug, name, taxonomy) {
  return {
    id: `${taxonomy}:${slug}`,
    name,
    slug,
    taxonomy
  };
}
