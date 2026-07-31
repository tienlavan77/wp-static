import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import buildProjectOnce from "../framework/src/dev-server/buildProjectOnce.js";
import createRouteDependencyGraph from "../framework/src/builder/graph/createRouteDependencyGraph.js";
import parseChangedItem from "../framework/src/builder/planner/parseChangedItem.js";
import planIncrementalBuild from "../framework/src/builder/planner/planIncrementalBuild.js";

const execFileAsync = promisify(execFile);

test("parseChangedItem parses content and taxonomy changes", () => {
  assert.deepEqual(parseChangedItem("product:iphone-15"), {
    id: "iphone-15",
    raw: "product:iphone-15",
    routeSlug: "iphone-15",
    taxonomy: null,
    type: "product"
  });
  assert.deepEqual(parseChangedItem("term:product_cat:/dien-thoai/"), {
    id: "/dien-thoai/",
    raw: "term:product_cat:/dien-thoai/",
    routeSlug: "dien-thoai",
    taxonomy: "product_cat",
    type: "term"
  });
});

test("route dependency graph maps changed products to product and archive routes", async () => {
  const graph = createRouteDependencyGraph(createIncrementalFixtureSitePlan());
  const affected = graph.findAffectedRoutes([parseChangedItem("product:iphone-15")]);

  assert.equal(affected.includes("/iphone-15"), true);
  assert.equal(affected.includes("/dien-thoai"), true);
  assert.equal(affected.includes("/thoi-trang"), false);
});

test("site SEO changes rebuild every route that carries site-wide canonical metadata", () => {
  const sitePlan = {
    routes: [
      { content: { id: "page-1", slug: "about", type: "page" }, outputPath: "about.html", path: "/about" },
      { content: { id: "product-1", slug: "card", type: "product" }, outputPath: "card.html", path: "/card" }
    ]
  };
  const graph = createRouteDependencyGraph(sitePlan);

  assert.deepEqual(graph.findAffectedRoutes([parseChangedItem("site:seo")]), ["/about", "/card"]);
});

test("incremental plan maps taxonomy changes to slug-only archive routes", async () => {
  const plan = planIncrementalBuild(createIncrementalFixtureSitePlan(), [
    parseChangedItem("term:product_cat:dien-thoai")
  ]);

  assert.equal(plan.fullBuild, false);
  assert.deepEqual(plan.changedRoutes, ["/iphone-15", "/dien-thoai"]);
  assert.deepEqual(plan.affectedPages.map((page) => page.route.outputPath), [
    "iphone-15.html",
    "dien-thoai.html"
  ]);
  assert.equal(typeof plan.inputHash, "string");
});

test("buildProjectOnce supports changed item incremental builds", async () => {
  const projectDir = await createIsolatedCommerceProject("wpsc-incremental-build-");
  await buildProjectOnce(projectDir);
  const incremental = await buildProjectOnce(projectDir, {
    changed: ["product:demo-product"]
  });
  const manifest = JSON.parse(await readFile(incremental.result.manifestPath, "utf8"));

  assert.equal(incremental.result.fullBuild, false);
  assert.equal(incremental.result.pagesWritten, 1);
  assert.deepEqual(incremental.result.changedRoutes, ["/demo-product"]);
  assert.deepEqual(manifest.incremental.changedRoutes, ["/demo-product"]);
});

async function createIsolatedCommerceProject(prefix) {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), prefix));
  await cp("templates/commerce", projectDir, {
    filter(source) {
      return !source.includes(`${path.sep}dist`) && !source.includes(`${path.sep}.wpsc`);
    },
    recursive: true
  });

  return projectDir;
}

test("cli build accepts repeated changed item flags", async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-incremental-cli-"));
  await cp("templates/commerce", projectDir, {
    filter(source) {
      return !source.includes(`${path.sep}dist`) && !source.includes(`${path.sep}.wpsc`);
    },
    recursive: true
  });

  await execFileAsync("node", [
    "framework/src/cli/index.js",
    "build",
    "--project",
    projectDir
  ]);
  const result = await execFileAsync("node", [
    "framework/src/cli/index.js",
    "build",
    "--project",
    projectDir,
    "--changed",
    "product:demo-product",
    "--changed",
    "page:home"
  ]);

  assert.match(result.stdout, /Pages: 2/);
  assert.match(result.stdout, /Incremental: \/, \/demo-product/);
});

function createIncrementalFixtureSitePlan() {
  const phoneTerm = {
    id: "term-phone",
    slug: "dien-thoai",
    taxonomy: "product_cat"
  };
  const fashionTerm = {
    id: "term-fashion",
    slug: "thoi-trang",
    taxonomy: "product_cat"
  };
  const product = {
    id: "iphone-15",
    type: "product",
    slug: "iphone-15",
    data: {
      terms: [phoneTerm]
    }
  };
  const unrelatedProduct = {
    id: "ao-thun-basic",
    type: "product",
    slug: "ao-thun-basic",
    data: {
      terms: [fashionTerm]
    }
  };
  const routes = [
    {
      content: product,
      outputPath: "iphone-15.html",
      path: "/iphone-15"
    },
    {
      content: unrelatedProduct,
      outputPath: "ao-thun-basic.html",
      path: "/ao-thun-basic"
    },
    {
      archive: {
        term: phoneTerm
      },
      content: {
        id: "archive:product_cat:dien-thoai",
        type: "archive:product_cat",
        slug: "dien-thoai",
        data: {
          archive: {
            items: [product],
            term: phoneTerm
          },
          items: [product],
          term: phoneTerm
        }
      },
      outputPath: "dien-thoai.html",
      path: "/dien-thoai"
    },
    {
      archive: {
        term: fashionTerm
      },
      content: {
        id: "archive:product_cat:thoi-trang",
        type: "archive:product_cat",
        slug: "thoi-trang",
        data: {
          archive: {
            items: [unrelatedProduct],
            term: fashionTerm
          },
          items: [unrelatedProduct],
          term: fashionTerm
        }
      },
      outputPath: "thoi-trang.html",
      path: "/thoi-trang"
    }
  ];

  return {
    pages: routes.map((route) => ({
      route
    })),
    routes,
    theme: {
      metadata: {
        name: "Incremental Fixture"
      }
    }
  };
}
