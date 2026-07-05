import assert from "node:assert/strict";
import test from "node:test";

test("package boundary entrypoints export expected APIs", async () => {
  const shared = await import("../packages/shared/src/index.js");
  const core = await import("../packages/core/src/index.js");
  const adapters = await import("../packages/adapters/src/index.js");
  const router = await import("../packages/router/src/index.js");
  const renderer = await import("../packages/renderer/src/index.js");
  const builder = await import("../packages/builder/src/index.js");
  const builderUi = await import("../packages/builder-ui/src/index.js");
  const cli = await import("../packages/cli/src/index.js");

  assert.equal(typeof shared.escapeHtml, "function");
  assert.equal(typeof core.compile, "function");
  assert.equal(typeof adapters.createWordPressAdapter, "function");
  assert.equal(typeof router.createRoutes, "function");
  assert.equal(typeof renderer.renderPage, "function");
  assert.equal(typeof builder.buildSite, "function");
  assert.equal(typeof builder.createBuilderWorkflow, "function");
  assert.equal(typeof builder.createLayoutDocument, "function");
  assert.equal(typeof builder.createLayoutRevisionStore, "function");
  assert.equal(typeof builder.renderLayout, "function");
  assert.equal(typeof builder.renderThemePreview, "function");
  assert.equal(builderUi.builderUiApp.status, "prototype");
  assert.equal(typeof cli.startDevServer, "function");
});
