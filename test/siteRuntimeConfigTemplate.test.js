import assert from "node:assert/strict";
import test from "node:test";
import createSiteRuntimeConfigTemplate from "../src/runtime/createSiteRuntimeConfigTemplate.js";

test("Site Runtime template delegates theme selection to the Runtime V1 Builder", () => {
  const template = createSiteRuntimeConfigTemplate({ webhookBaseUrl: "https://runtime.example.test/webhook" });
  assert.doesNotMatch(template, /themeRenderer/);
  assert.doesNotMatch(template, /createSharedStorefrontTheme/);
  assert.doesNotMatch(template, /WPSC Site Runtime is running/);
});
