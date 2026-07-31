import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createSearchService from "../framework/src/search/createSearchService.js";
import writeSearchIndex from "../framework/src/builder/search/writeSearchIndex.js";

test("Search Service supports create, update, replace and deterministic query", () => {
  const service = createSearchService({ siteId: "site-a" });
  const first = service.create({ items: [
    { id: "1", keywords: "dien thoai iphone", slug: "iphone", title: "Điện thoại iPhone" },
    { id: "2", keywords: "ao thun", slug: "ao-thun", title: "Áo thun" }
  ] });
  const updated = service.update(first, [{ id: "3", keywords: "iphone pro", slug: "iphone-pro", title: "iPhone Pro" }]);
  const results = service.query(updated, { query: "iphone", siteId: "site-a" });

  assert.equal(first.schema, "wpsc.search-index");
  assert.equal(updated.itemCount, 3);
  assert.deepEqual(results.results.map((item) => item.id), ["3", "1"]);
  assert.equal(results.results[0].ranking.score >= results.results[1].ranking.score, true);
  assert.equal(service.replace(updated, [first.items[0]]).itemCount, 1);
});

test("Search Service isolates queries and supports invalidation/rebuild", () => {
  const service = createSearchService({ siteId: "site-a" });
  const index = service.create({ items: [{ id: "1", keywords: "hello", title: "Hello", slug: "hello" }] });

  assert.equal(service.query(index, { query: "hello", siteId: "site-b" }).total, 0);
  assert.equal(service.invalidate(index).invalidated, true);
  assert.equal(service.rebuild({ siteId: "site-a", items: [] }).siteId, "site-a");
  assert.throws(() => service.query({ items: [] }, { query: "hello" }), /compatible Search Index/);
});

test("Builder writes the Search Contract with Site identity", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-search-"));
  const content = {
    data: { excerpt: "A searchable page" },
    id: "page-1",
    slug: "welcome",
    title: "Welcome",
    type: "page"
  };
  const result = await writeSearchIndex({
    routes: [{ content, path: "/welcome" }]
  }, {
    outputDir,
    siteId: "site-a"
  });
  const payload = JSON.parse(await readFile(result.indexPath, "utf8"));

  assert.equal(payload.schema, "wpsc.search-index");
  assert.equal(payload.siteId, "site-a");
  assert.equal(payload.itemCount, 1);
  assert.equal(payload.items[0].path, "/welcome");
});
