import assert from "node:assert/strict";
import test from "node:test";
import createRuntimeBrowserViews from "../framework/src/runtime/browser/createRuntimeBrowserViews.js";

test("Runtime Browser views render HTML clients that call only Runtime REST endpoints", () => {
  const views = createRuntimeBrowserViews();
  const installer = views.installer("company-a");
  const dashboard = views.dashboard({ metadata: { name: "Company A", status: "READY_FOR_FIRST_BUILD" }, source: { connected: false } });
  assert.match(installer, /\/installer\/start/);
  assert.match(installer, /\/installer\/complete/);
  assert.doesNotMatch(installer, /READY_FOR_FIRST_BUILD/);
  assert.match(dashboard, /\/dashboard\/source\/register/);
  assert.match(dashboard, /\/dashboard\/source\/test/);
  assert.match(dashboard, /Check connection/);
  assert.match(dashboard, /Save source/);
  assert.match(dashboard, /\/dashboard\/webhook\/register/);
  assert.match(dashboard, /\/dashboard\/build/);
  assert.match(dashboard, /applicationPassword/);
  assert.match(dashboard, /woocommerceConsumerSecret/);
});
