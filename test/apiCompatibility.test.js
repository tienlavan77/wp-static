import assert from "node:assert/strict";
import test from "node:test";

const stableRootExports = [
  "addRelatedProducts",
  "applyAdvancedCommerceData",
  "buildSite",
  "cleanOutput",
  "compile",
  "createBlockRegistry",
  "createBlockSchema",
  "createBuildManifest",
  "createCommerceCollections",
  "createCommerceRuntime",
  "createCommerceServer",
  "createContent",
  "createContentGraph",
  "createLayoutDocument",
  "createLayoutRevisionStore",
  "createMockAdapter",
  "createProductVariantContents",
  "createRoutes",
  "createRsyncDeployPlan",
  "createSessionStore",
  "createWooCommerceAdapter",
  "createWordPressAdapter",
  "createWordPressWooCommerceAdapter",
  "html",
  "loadConfig",
  "normalizeConfigPaths",
  "renderBlock",
  "renderLayout",
  "renderPage",
  "renderThemePreview",
  "resolveCustomerSession",
  "resolveWooCommerceCredentials",
  "resolveWordPressAuth",
  "runRsyncDeploy",
  "validateConfig"
];

test("root package keeps stable public API exports", async () => {
  const api = await import("../src/index.js");

  for (const exportName of stableRootExports) {
    assert.equal(typeof api[exportName], "function", `${exportName} should be exported`);
  }

  assert.equal(api.version, "1.0.0");
  assert.equal(api.getPackageInfo().status, "stable");
});

test("workspace package entrypoints keep stable API families", async () => {
  const core = await import("../packages/core/src/index.js");
  const builder = await import("../packages/builder/src/index.js");
  const cli = await import("../packages/cli/src/index.js");
  const adapters = await import("../packages/adapters/src/index.js");
  const renderer = await import("../packages/renderer/src/index.js");

  assert.equal(typeof core.compile, "function");
  assert.equal(typeof core.applyAdvancedCommerceData, "function");
  assert.equal(typeof builder.renderLayout, "function");
  assert.equal(typeof builder.createBuilderWorkflow, "function");
  assert.equal(typeof cli.createRsyncDeployPlan, "function");
  assert.equal(typeof adapters.createWordPressAdapter, "function");
  assert.equal(typeof adapters.createWordPressWooCommerceAdapter, "function");
  assert.equal(typeof adapters.createWooCommerceAdapter, "function");
  assert.equal(typeof renderer.renderPage, "function");
});
