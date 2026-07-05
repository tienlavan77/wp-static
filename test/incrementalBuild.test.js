import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import buildProjectOnce from "../src/dev-server/buildProjectOnce.js";
import createRouteDependencyGraph from "../src/incremental/createRouteDependencyGraph.js";
import parseChangedItem from "../src/incremental/parseChangedItem.js";
import planIncrementalBuild from "../src/incremental/planIncrementalBuild.js";

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
  const projectDir = await createIsolatedBasicShopProject("wpsc-incremental-graph-");
  const full = await buildProjectOnce(projectDir);
  const graph = createRouteDependencyGraph(full.sitePlan);
  const affected = graph.findAffectedRoutes([parseChangedItem("product:iphone-15")]);

  assert.equal(affected.includes("/iphone-15"), true);
  assert.equal(affected.includes("/dien-thoai"), true);
  assert.equal(affected.includes("/thoi-trang"), false);
});

test("incremental plan maps taxonomy changes to slug-only archive routes", async () => {
  const projectDir = await createIsolatedBasicShopProject("wpsc-incremental-plan-");
  const full = await buildProjectOnce(projectDir);
  const plan = planIncrementalBuild(full.sitePlan, [
    parseChangedItem("term:product_cat:dien-thoai")
  ]);

  assert.equal(plan.fullBuild, false);
  assert.deepEqual(plan.changedRoutes, ["/iphone-15", "/iphone-15-128gb-den", "/iphone-15-256gb-xanh", "/dien-thoai"]);
  assert.deepEqual(plan.affectedPages.map((page) => page.route.outputPath), [
    "iphone-15.html",
    "iphone-15-128gb-den.html",
    "iphone-15-256gb-xanh.html",
    "dien-thoai.html"
  ]);
  assert.equal(typeof plan.inputHash, "string");
});

test("buildProjectOnce supports changed item incremental builds", async () => {
  const projectDir = await createIsolatedBasicShopProject("wpsc-incremental-build-");
  await buildProjectOnce(projectDir);
  const incremental = await buildProjectOnce(projectDir, {
    changed: ["product:iphone-15"]
  });
  const manifest = JSON.parse(await readFile(incremental.result.manifestPath, "utf8"));

  assert.equal(incremental.result.fullBuild, false);
  assert.equal(incremental.result.pagesWritten, 4);
  assert.deepEqual(incremental.result.changedRoutes, ["/iphone-15", "/iphone-15-128gb-den", "/iphone-15-256gb-xanh", "/dien-thoai"]);
  assert.deepEqual(manifest.incremental.changedRoutes, ["/iphone-15", "/iphone-15-128gb-den", "/iphone-15-256gb-xanh", "/dien-thoai"]);
});

async function createIsolatedBasicShopProject(prefix) {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), prefix));
  await cp("examples/basic-shop", projectDir, {
    filter(source) {
      return !source.includes(`${path.sep}dist`) && !source.includes(`${path.sep}.wpsc`);
    },
    recursive: true
  });

  return projectDir;
}

test("cli build accepts repeated changed item flags", async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-incremental-cli-"));
  await cp("examples/basic-shop", projectDir, {
    recursive: true
  });

  await execFileAsync("node", [
    "src/cli/index.js",
    "build",
    "--project",
    projectDir
  ]);
  const result = await execFileAsync("node", [
    "src/cli/index.js",
    "build",
    "--project",
    projectDir,
    "--changed",
    "product:iphone-15",
    "--changed",
    "term:product_cat:thoi-trang"
  ]);

  assert.match(result.stdout, /Pages: 6/);
  assert.match(result.stdout, /Incremental: \/iphone-15, \/ao-thun-basic, \/iphone-15-128gb-den, \/iphone-15-256gb-xanh, \/dien-thoai, \/thoi-trang/);
});
