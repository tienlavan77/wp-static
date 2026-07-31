import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("Sprint 8 gateways preserve Scheduler and provider ownership", async () => {
  const commerceGateway = await source("framework/src/publishing/createCommercePublishingGateway.js");
  const publishing = await source("framework/src/publishing/createPublishEventCoordinator.js");
  const checkout = await source("framework/src/runtime/checkout/createCheckoutService.js");

  assert.match(commerceGateway, /publishing\.publish/);
  assert.doesNotMatch(commerceGateway, /createBuildEngine|queue\.enqueue|dispatcher\.dispatch/);
  assert.match(publishing, /scheduler\.trigger/);
  assert.doesNotMatch(publishing, /createBuildEngine|dispatcher\.dispatch/);
  assert.match(checkout, /submitProvider/);
  assert.doesNotMatch(checkout, /woocommerceClient|createWooCommerceClient/);
});

test("Sprint 8 shared services do not own filesystem or provider clients", async () => {
  const files = [
    "framework/src/runtime/cart/createCartService.js",
    "framework/src/runtime/checkout/createCheckoutService.js",
    "framework/src/forms/createFormsService.js",
    "framework/src/cache/createSiteCacheService.js",
    "framework/src/performance/createPerformanceService.js",
    "framework/src/seo/createAdvancedSeoService.js"
  ];
  for (const file of files) {
    const text = await source(file);
    assert.doesNotMatch(text, /node:fs|writeFile|mkdir|createWooCommerceClient|wordpressClient/);
  }
});

test("Theme remains presentation-only and has no Source or provider imports", async () => {
  const files = await javascriptFiles("themes");
  for (const file of files) {
    const text = await readFile(file, "utf8");
    assert.doesNotMatch(text, /framework\/src\/(source|adapters)|woocommerceClient|wordpressClient/);
  }
});

test("Runtime Build Engine ownership is limited to the composition root", async () => {
  const files = await javascriptFiles("framework/src/runtime");
  const owners = [];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    if (text.includes("createBuildEngine")) owners.push(path.relative(root, file));
  }
  assert.deepEqual(owners, ["framework/src/runtime/bootstrap/createSiteRuntimeInstance.js"]);
});

async function source(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function javascriptFiles(relativeDir) {
  const directory = path.join(root, relativeDir);
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js")).map((entry) => path.join(entry.parentPath, entry.name)).sort();
}
