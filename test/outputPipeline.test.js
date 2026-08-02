import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createOutputPipeline from "../framework/src/output/createOutputPipeline.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

test("Output Pipeline is the sole writer for HTML and copied assets under site public", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-output-"));
  const asset = path.join(workspaceDir, "style.css");
  await writeFile(asset, "body{}", "utf8");
  const pipeline = createOutputPipeline({ repository: createSiteRepository({ workspaceDir }) });
  try {
    const result = await pipeline.write({ assets: [{ sourcePath: asset, targetPath: "assets/style.css" }], pages: [{ html: "<h1>Welcome</h1>", path: "/welcome/" }], siteId: "company-a" });
    assert.equal(result.ok, true);
    assert.equal(await readFile(path.join(result.publicDir, "welcome", "index.html"), "utf8"), "<h1>Welcome</h1>");
    assert.equal(await readFile(path.join(result.publicDir, "assets", "style.css"), "utf8"), "body{}");
    assert.match(await readFile(path.join(workspaceDir, "sites", "company-a", "public", "index.php"), "utf8"), /prefer generated static pages/);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Output Pipeline rejects paths outside site public", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-output-"));
  try {
    const result = await createOutputPipeline({ repository: createSiteRepository({ workspaceDir }) }).write({ pages: [{ html: "x", path: "/../unsafe/" }], siteId: "company-a" });
    assert.equal(result.ok, false);
    assert.equal(result.diagnostics.errors[0].code, "output.pipeline.write.failed");
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Output Pipeline replaces a full snapshot so deleted routes cannot remain public", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-output-"));
  const pipeline = createOutputPipeline({ repository: createSiteRepository({ workspaceDir }) });
  try {
    await pipeline.write({ pages: [{ html: "old", path: "/old" }], siteId: "company-a" });
    await pipeline.write({ pages: [{ html: "new", path: "/new" }], replace: true, siteId: "company-a" });
    await assert.rejects(readFile(path.join(workspaceDir, "sites", "company-a", "public", "dist", "old", "index.html")));
    assert.equal(await readFile(path.join(workspaceDir, "sites", "company-a", "public", "dist", "new", "index.html"), "utf8"), "new");
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Output Pipeline recovers the previous snapshot before a new publish", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-output-"));
  const pipeline = createOutputPipeline({ repository: createSiteRepository({ workspaceDir }) });
  try {
    const root = path.join(workspaceDir, "sites", "company-a", "public");
    await writeFile(path.join(root, ".dist-previous-recovery", "old", "index.html"), "old", { recursive: true }).catch(async () => { await (await import("node:fs/promises")).mkdir(path.join(root, ".dist-previous-recovery", "old"), { recursive: true }); await writeFile(path.join(root, ".dist-previous-recovery", "old", "index.html"), "old"); });
    await pipeline.write({ buildId: "recovery", pages: [{ html: "new", path: "/new" }], siteId: "company-a" });
    assert.equal(await readFile(path.join(root, "dist", "new", "index.html"), "utf8"), "new");
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Output Pipeline rejects an incomplete verified staging snapshot before publish", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-output-"));
  try {
    const result = await createOutputPipeline({ repository: createSiteRepository({ workspaceDir }) }).write({ pages: [{ html: "new", path: "/new" }], siteId: "company-a", verify: true });
    assert.equal(result.ok, false);
    assert.equal(result.diagnostics.errors[0].code, "output.pipeline.write.failed");
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
