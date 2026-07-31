import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createProductSupportBundleService from "../framework/src/product/createProductSupportBundleService.js";
import createSecretsBoundaryService from "../framework/src/security/createSecretsBoundaryService.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

test("Product Support Bundle collects redacted operational evidence without secrets", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-support-bundle-"));
  try {
    const security = createSecretsBoundaryService({ credentialStore: { read: async () => ({}) } });
    const service = createProductSupportBundleService({
      repository: createSiteRepository({ workspaceDir }),
      registry: { listSites: async () => [{ siteId: "alpha", domains: ["alpha.example.test"] }] }, security,
      product: { productId: "wpsc", version: "1.0.0", applicationPassword: "never-write" },
      runtime: { state: () => ({ readiness: "ready", token: "never-write" }) },
      health: { inspect: async () => ({ diagnostics: { errors: [{ code: "source.timeout", message: "slow", severity: "error" }], warnings: [] }, ok: false }) },
      deployment: { status: async () => ({ deployments: [{ artifactId: "a1", consumerSecret: "never-write" }], diagnostics: { errors: [], warnings: [] }, ok: true }) },
      observability: { listLogs: async () => [{ level: "error", message: "fail", authorization: "never-write" }] },
      now: () => "2026-07-31T00:00:00.000Z"
    });
    const result = await service.create({ bundleId: "bundle-1" });
    const content = await readFile(path.join(result.path, "product.json"), "utf8");
    const errors = await readFile(path.join(result.path, "recent-errors.ndjson"), "utf8");
    assert.equal(result.ok, true);
    assert.equal(content.includes("never-write"), false);
    assert.equal(errors.includes("never-write"), false);
    assert.equal(JSON.parse(await readFile(path.join(result.path, "bundle.json"), "utf8")).schema, "wpsc.product-support-bundle");
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
