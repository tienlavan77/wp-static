import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createProductPackageService from "../framework/src/product/createProductPackageService.js";
import createProductManifest from "../framework/src/product/createProductManifest.js";

test("Product Package creates an immutable verified distribution artifact without Site state", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-product-package-"));
  const sourceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-product-package-source-"));
  try {
    await mkdir(path.join(sourceDir, "framework", "src"), { recursive: true });
    await writeFile(path.join(sourceDir, "framework", "src", "index.js"), "export default 1;");
    await writeFile(path.join(sourceDir, "package.json"), '{"name":"wpsc"}');
    await mkdir(path.join(sourceDir, "sites", "alpha"), { recursive: true });
    await writeFile(path.join(sourceDir, "sites", "alpha", "secret.txt"), "never-package-site-state");
    const service = createProductPackageService({ workspaceDir, now: () => "2026-07-31T00:00:00.000Z" });
    const created = await service.create({ packageId: "wpsc-1.0.0", product: createProductManifest({ version: "1.0.0" }), sourceDir });
    assert.equal(created.ok, true);
    assert.equal(created.artifact.files.some((file) => file.path.includes("sites/")), false);
    assert.equal((await service.verify("wpsc-1.0.0")).verified, true);
    assert.equal((await service.create({ packageId: "wpsc-1.0.0", product: createProductManifest({ version: "1.0.0" }), sourceDir })).ok, false);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); await rm(sourceDir, { force: true, recursive: true }); }
});
