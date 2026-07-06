import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import buildProjectOnce from "../src/dev-server/buildProjectOnce.js";

test("UI storefront demo can be rebuilt as a single route", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-ui-demo-"));
  const first = await buildProjectOnce("examples/basic-shop", {
    changed: ["page:ui-storefront-demo"]
  });
  const html = await readFile(path.join(first.projectDir, "dist", "ui-storefront-demo.html"), "utf8");
  const data = JSON.parse(await readFile(path.join(first.projectDir, "dist", "data", "routes", "ui-storefront-demo.json"), "utf8"));

  assert.equal(first.result.pagesWritten, 1);
  assert.deepEqual(first.incremental.changedRoutes, ["/ui-storefront-demo"]);
  assert.match(html, /Tín Sinh Phát/);
  assert.match(html, /storefront.css\?v=ui-2/);
  assert.equal(data.route.path, "/ui-storefront-demo");
  assert.equal(outputDir.includes("wpsc-ui-demo-"), true);
});
