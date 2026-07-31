import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import buildProjectOnce from "../framework/src/dev-server/buildProjectOnce.js";

test("UI storefront demo can be rebuilt as a single route", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-ui-demo-"));
  const projectDir = path.join(outputDir, "project");
  await cp("fixtures/basic-shop", projectDir, { recursive: true });
  const first = await buildProjectOnce(projectDir, {
    changed: ["page:ui-storefront-demo"]
  });
  const html = await readFile(path.join(first.projectDir, "dist", "ui-storefront-demo.html"), "utf8");
  const data = JSON.parse(await readFile(path.join(first.projectDir, "dist", "data", "routes", "ui-storefront-demo.json"), "utf8"));

  assert.equal(first.result.pagesWritten, 1);
  assert.deepEqual(first.incremental.changedRoutes, ["/ui-storefront-demo"]);
  assert.match(html, /UI Storefront Demo/);
  assert.match(html, /storefront.css\?v=ui-23/);
  assert.equal(data.route.path, "/ui-storefront-demo");
  assert.equal(outputDir.includes("wpsc-ui-demo-"), true);
  await rm(outputDir, { force: true, recursive: true });
});
