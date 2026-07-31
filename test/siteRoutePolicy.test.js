import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createContent from "../framework/src/core/createContent.js";
import createRoutes from "../framework/src/builder/router/createRoutes.js";
import createSiteRoutePolicy from "../framework/src/routing/createSiteRoutePolicy.js";
import writeRouteManifest from "../framework/src/routing/writeRouteManifest.js";

test("Site Route Policy resolves source permalinks, canonical URLs, and deterministic 404", () => {
  const policy = createSiteRoutePolicy({
    homepage: "home",
    site: { siteId: "site-a", url: "https://site.example.test" }
  });
  const routes = createRoutes([
    content("page-home", "home"),
    content("post-1", "post", { link: "https://cms.example.test/news/2026/post/" }),
    content("runtime:not-found", "404")
  ], { routingPolicy: policy });

  assert.deepEqual(routes.map((route) => route.path), ["/", "/news/2026/post", "/404"]);
  assert.equal(routes[1].outputPath, "news/2026/post.html");
  assert.equal(routes[1].canonical, "https://site.example.test/news/2026/post");
  assert.equal(routes[2].type, "not-found");
  assert.equal(routes[2].outputPath, "404.html");
});

test("Site Route Policy gives the WordPress front-page permalink precedence over homepage fallback", () => {
  const policy = createSiteRoutePolicy({ homepage: "homepage", site: { siteId: "site-a", url: "https://site.example.test" } });
  const routes = createRoutes([
    content("page-602", "front-page", { link: "https://cms.example.test/" }),
    content("page-6", "homepage", { link: "https://cms.example.test/homepage/" })
  ], { routingPolicy: policy });

  assert.deepEqual(routes.map((route) => [route.content.id, route.path]), [
    ["page-602", "/"],
    ["page-6", "/homepage"]
  ]);
});

test("Site Route Policy normalizes redirect mapping and writes a site-scoped route manifest", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-routes-"));
  const policy = createSiteRoutePolicy({
    redirects: [{ from: "https://old.example.test/old-product/", status: 302, to: "/products/new-product/" }, { from: "/legacy", to: "/new" }],
    site: { siteId: "site-a", url: "https://site.example.test" }
  });
  const routes = createRoutes([content("page-new", "new")], { routingPolicy: policy });
  const result = await writeRouteManifest({ routing: policy, routes }, { outputDir });
  const manifest = JSON.parse(await readFile(result.manifestPath, "utf8"));

  assert.equal(manifest.schema, "wpsc.site-route-policy");
  assert.equal(manifest.siteId, "site-a");
  assert.deepEqual(manifest.redirects, [
    { from: "/legacy", status: 301, to: "/new" },
    { from: "/old-product", status: 302, to: "/products/new-product" }
  ]);
  assert.equal(manifest.routes[0].canonical, "https://site.example.test/new");
});

function content(id, slug, data = {}) {
  return createContent({ data, domain: "wordpress", id, slug, title: id, type: "page" });
}
