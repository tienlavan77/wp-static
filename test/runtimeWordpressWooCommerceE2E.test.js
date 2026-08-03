import assert from "node:assert/strict";
import { access, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import createRuntimeWorkspace from "./fixtures/runtime-wordpress-woocommerce/createRuntimeWorkspace.js";
import createWordPressRestFixture from "./fixtures/runtime-wordpress-woocommerce/createWordPressRestFixture.js";
import createWordPressSourceAdapter from "../framework/src/source/createWordPressSourceAdapter.js";
import createWooCommerceRestFixture from "./fixtures/runtime-wordpress-woocommerce/createWooCommerceRestFixture.js";
import createWooCommerceAdapter from "../framework/src/adapters/woocommerce/woocommerceAdapter.js";
import createWordPressWooCommerceRestFixture from "./fixtures/runtime-wordpress-woocommerce/createWordPressWooCommerceRestFixture.js";
import createSiteRuntimeInstance from "../framework/src/runtime/bootstrap/createSiteRuntimeInstance.js";
import { createSiteRuntimeSkeleton } from "../framework/src/runtime/bootstrap/createSiteRuntime.js";
import createSourceCredentialStore from "../framework/src/runtime/source/createSourceCredentialStore.js";
import createSourceAdapterLoader from "../framework/src/source/createSourceAdapterLoader.js";
import createSourceRegistry from "../framework/src/source/createSourceRegistry.js";
import { JobStatus, JobTrigger } from "../framework/src/scheduler/contracts/schedulerContracts.js";

async function collectedText(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const texts = [];
  for (const entry of entries) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) texts.push(...await collectedText(target));
    else texts.push(await readFile(target, "utf8"));
  }
  return texts;
}

async function createPublishedWooRuntimeScenario(options = {}) {
  const workspace = await createRuntimeWorkspace();
  const fixture = await createWordPressWooCommerceRestFixture();
  const uuid = options.uuid || "a6cd6ee1-edc4-4dd8-9eb1-b4145f562b07";
  const secret = options.secret || "c026-matrix-webhook-secret";
  try {
    await options.prepare?.(fixture.state);
    await options.configureFixture?.(fixture);
    await createSiteRuntimeSkeleton({ repository: workspace.repository, siteId: workspace.siteId, uuid });
    await workspace.repository.writeSourceMetadata(workspace.siteId, { adapterVersion: "1.0", capabilities: ["supportsWebhook", "supportsWooCommerce"], endpoint: fixture.baseUrl, schema: "source-metadata", schemaVersion: 1, sourceType: "wordpress-woocommerce" });
    await createSourceCredentialStore({ repository: workspace.repository }).write(workspace.siteId, { applicationPassword: fixture.applicationPassword, woocommerceConsumerKey: fixture.consumerKey, woocommerceConsumerSecret: fixture.consumerSecret, wordpressUsername: fixture.username });
    await writeFile(path.join(workspace.repository.resolveSiteRoot(workspace.siteId), "config", "webhook.json"), `${JSON.stringify({ secret, uuid })}\n`);
    const adapterLoader = createSourceAdapterLoader({ registry: createSourceRegistry({ adapters: [{ type: "wordpress-woocommerce", create: (adapterOptions) => createWordPressSourceAdapter({ ...adapterOptions, sourceType: "wordpress-woocommerce" }) }] }) });
    const runtime = createSiteRuntimeInstance({ adapterLoader, domains: { "woo-e2e.fixture.test": workspace.siteId }, repository: workspace.repository, site: { url: "https://woo-e2e.fixture.test" }, webhookBaseUrl: "https://runtime.fixture.test/webhook" });
    runtime.services.scheduler.trigger({ changed: [], siteId: workspace.siteId, triggerType: "manual" });
    const initial = await runtime.services.scheduler.tick();
    assert.equal(initial.dispatched.build.status, "SUCCESS", JSON.stringify(initial.diagnostics));
    return { dist: path.join(workspace.repository.resolveSiteRoot(workspace.siteId), "public", "dist"), fixture, runtime, secret, siteId: workspace.siteId, uuid, workspace };
  } catch (error) { await Promise.all([fixture.close(), workspace.cleanup()]); throw error; }
}

async function completeWebhookScenario(scenario, body) {
  const accepted = await scenario.runtime.services.webhookReceiver.handle(scenario.siteId, scenario.uuid, {
    body, headers: { "x-wpsc-webhook-secret": scenario.secret }, method: "POST"
  });
  assert.equal(accepted.status, 202, JSON.stringify(accepted.body));
  const tick = await scenario.runtime.services.scheduler.tick();
  assert.equal(tick.dispatched.build.status, "SUCCESS", JSON.stringify(tick.diagnostics));
  return tick;
}

async function closeScenario(scenario) {
  await Promise.all([scenario.fixture.close(), scenario.workspace.cleanup()]);
}

test("C026 Phase 1 isolates each wordpress-woocommerce Runtime workspace", async () => {
  const first = await createRuntimeWorkspace({ siteId: "woo-a" });
  const second = await createRuntimeWorkspace({ siteId: "woo-b" });
  try {
    assert.notEqual(first.workspaceDir, second.workspaceDir);
    assert.notEqual(first.repository.resolveSiteRoot(first.siteId), second.repository.resolveSiteRoot(second.siteId));
    await assert.rejects(access(path.join(first.repository.resolveSiteRoot(first.siteId), "public", "dist")));
  } finally { await Promise.all([first.cleanup(), second.cleanup()]); }
});

test("C026 Phase 3 serves WooCommerce Product/category/variations through consumer-key auth", async () => {
  const fixture = await createWooCommerceRestFixture();
  try {
    const adapter = createWooCommerceAdapter({ baseUrl: fixture.baseUrl, consumerKey: "ck_fixture", consumerSecret: "cs_fixture", includeVariations: true });
    const [products, collections] = await Promise.all([adapter.getContents(), adapter.getCollections()]);
    assert.equal(products[0].title, "Product A");
    assert.equal(products[0].data.variants.length, 2);
    assert.equal(collections.categories[0].slug, "featured");
    assert.equal(fixture.requests.length > 0, true);
    assert.equal(fixture.requests.every((request) => request.key === "ck_fixture" && request.secret === "cs_fixture"), true);
  } finally { await fixture.close(); }
});

test("C026 Phase 2 serves WordPress REST data through Application Password auth", async () => {
  const fixture = await createWordPressRestFixture({ state: { categories: [{ count: 1, id: 7, name: "Featured", slug: "featured" }], media: [], pages: [{ content: { rendered: "<p>Home</p>" }, excerpt: { rendered: "" }, id: 1, slug: "home", title: { rendered: "Home" } }], posts: [], tags: [], users: [] } });
  try {
    const adapter = createWordPressSourceAdapter({ contentTypes: ["pages"], credentials: { applicationPassword: "fixture-app-password", wordpressUsername: "fixture-user" } });
    await adapter.initialize({ endpoint: fixture.baseUrl });
    const [contents, collections] = await Promise.all([adapter.getContents(), adapter.getCollections()]);
    assert.equal(contents[0].title, "Home");
    assert.equal(collections.terms[0].slug, "featured");
    assert.equal(fixture.requests.length > 0, true);
    assert.equal(fixture.requests.every((request) => request.authorization?.startsWith("Basic ")), true);
  } finally { await fixture.close(); }
});

test("C026 Phase 4 combines authenticated WordPress and WooCommerce source reads", async () => {
  const fixture = await createWordPressWooCommerceRestFixture();
  try {
    const adapter = createWordPressSourceAdapter({
      credentials: {
        applicationPassword: fixture.applicationPassword,
        woocommerceConsumerKey: fixture.consumerKey,
        woocommerceConsumerSecret: fixture.consumerSecret,
        wordpressUsername: fixture.username
      },
      sourceType: "wordpress-woocommerce"
    });
    await adapter.initialize({ endpoint: fixture.baseUrl, siteId: "woo-e2e-site" });
    const [contents, collections, metadata] = await Promise.all([adapter.getContents(), adapter.getCollections(), adapter.getMetadata()]);
    assert.ok(contents.some((item) => item.title === "Home"));
    assert.ok(contents.some((item) => item.title === "Product A"));
    assert.equal(collections.productCategories[0].slug, "featured");
    assert.deepEqual(metadata.capabilities, ["supportsWebhook", "supportsWooCommerce"]);
    const wordpressRequests = fixture.requests.filter((request) => !request.woo);
    const wooRequests = fixture.requests.filter((request) => request.woo);
    assert.ok(wordpressRequests.length > 0);
    assert.ok(wooRequests.length > 0);
    assert.ok(wordpressRequests.every((request) => request.authorization?.startsWith("Basic ")));
    assert.ok(wooRequests.every((request) => request.key === fixture.consumerKey && request.secret === fixture.consumerSecret));
  } finally { await fixture.close(); }
});

test("C026 Phase 5 builds a combined WordPress WooCommerce Site through Runtime scheduling", { timeout: 30_000 }, async () => {
  const workspace = await createRuntimeWorkspace();
  const fixture = await createWordPressWooCommerceRestFixture();
  const uuid = "5d00f80f-c3c8-42e7-8702-2eb963d70a77";
  const secret = "c026-phase-5-webhook-secret";
  try {
    await createSiteRuntimeSkeleton({ repository: workspace.repository, siteId: workspace.siteId, uuid });
    await workspace.repository.writeSourceMetadata(workspace.siteId, {
      adapterVersion: "1.0", capabilities: ["supportsWebhook", "supportsWooCommerce"], endpoint: fixture.baseUrl,
      schema: "source-metadata", schemaVersion: 1, sourceType: "wordpress-woocommerce"
    });
    await createSourceCredentialStore({ repository: workspace.repository }).write(workspace.siteId, {
      applicationPassword: fixture.applicationPassword, woocommerceConsumerKey: fixture.consumerKey,
      woocommerceConsumerSecret: fixture.consumerSecret, wordpressUsername: fixture.username
    });
    await writeFile(path.join(workspace.repository.resolveSiteRoot(workspace.siteId), "config", "webhook.json"), `${JSON.stringify({ secret, uuid })}\n`);
    const adapterLoader = createSourceAdapterLoader({ registry: createSourceRegistry({ adapters: [{
      type: "wordpress-woocommerce",
      create: (options) => createWordPressSourceAdapter({ ...options, sourceType: "wordpress-woocommerce" })
    }] }) });
    const runtime = createSiteRuntimeInstance({ adapterLoader, domains: { "woo-e2e.fixture.test": workspace.siteId }, repository: workspace.repository, webhookBaseUrl: "https://runtime.fixture.test/webhook" });
    const queued = runtime.services.scheduler.trigger({ changed: [], siteId: workspace.siteId, triggerType: "manual" });
    assert.equal(queued.ok, true);
    const tick = await runtime.services.scheduler.tick();
    assert.equal(tick.ok, true, JSON.stringify(tick.diagnostics));
    assert.equal(tick.dispatched.build.status, "SUCCESS");
    const dist = path.join(workspace.repository.resolveSiteRoot(workspace.siteId), "public", "dist");
    const routes = JSON.parse(await readFile(path.join(dist, ".wpsc", "routes.json"), "utf8"));
    assert.ok(routes.routes.some((route) => route.path === "/product-a"));
    assert.ok(routes.routes.some((route) => route.path === "/featured"));
    assert.match(await readFile(path.join(dist, "product-a", "index.html"), "utf8"), /Product A/);
    assert.match(await readFile(path.join(dist, "featured", "index.html"), "utf8"), /Product A/);
    assert.ok(fixture.requests.some((request) => !request.woo));
    assert.ok(fixture.requests.some((request) => request.woo));
    // Credentials remain Runtime configuration only. Public output and the
    // Build-owned storage tree must never make them recoverable artifacts.
    const persistedBuildData = await collectedText(dist);
    persistedBuildData.push(...await collectedText(path.join(workspace.repository.resolveSiteRoot(workspace.siteId), "storage")));
    const credentials = [
      fixture.username,
      fixture.applicationPassword,
      fixture.consumerKey,
      fixture.consumerSecret,
      Buffer.from(`${fixture.username}:${fixture.applicationPassword}`).toString("base64")
    ];
    for (const credential of credentials) assert.equal(persistedBuildData.some((text) => text.includes(credential)), false, `Credential leaked into build artifact: ${credential}`);
  } finally { await Promise.all([fixture.close(), workspace.cleanup()]); }
});

test("C026 Phase 6 incrementally republishes Product and product-category output from a WooCommerce webhook", { timeout: 30_000 }, async () => {
  const workspace = await createRuntimeWorkspace();
  const fixture = await createWordPressWooCommerceRestFixture();
  const uuid = "ab2ab87e-78e9-4eb0-bbe9-5e6f4987115f";
  const secret = "c026-phase-6-webhook-secret";
  try {
    await createSiteRuntimeSkeleton({ repository: workspace.repository, siteId: workspace.siteId, uuid });
    await workspace.repository.writeSourceMetadata(workspace.siteId, { adapterVersion: "1.0", capabilities: ["supportsWebhook", "supportsWooCommerce"], endpoint: fixture.baseUrl, schema: "source-metadata", schemaVersion: 1, sourceType: "wordpress-woocommerce" });
    await createSourceCredentialStore({ repository: workspace.repository }).write(workspace.siteId, { applicationPassword: fixture.applicationPassword, woocommerceConsumerKey: fixture.consumerKey, woocommerceConsumerSecret: fixture.consumerSecret, wordpressUsername: fixture.username });
    await writeFile(path.join(workspace.repository.resolveSiteRoot(workspace.siteId), "config", "webhook.json"), `${JSON.stringify({ secret, uuid })}\n`);
    const adapterLoader = createSourceAdapterLoader({ registry: createSourceRegistry({ adapters: [{ type: "wordpress-woocommerce", create: (options) => createWordPressSourceAdapter({ ...options, sourceType: "wordpress-woocommerce" }) }] }) });
    const runtime = createSiteRuntimeInstance({ adapterLoader, domains: { "woo-e2e.fixture.test": workspace.siteId }, repository: workspace.repository, webhookBaseUrl: "https://runtime.fixture.test/webhook" });
    runtime.services.scheduler.trigger({ changed: [], siteId: workspace.siteId, triggerType: "manual" });
    assert.equal((await runtime.services.scheduler.tick()).dispatched.build.status, "SUCCESS");
    const dist = path.join(workspace.repository.resolveSiteRoot(workspace.siteId), "public", "dist");
    // Prove this fixture's homepage is genuinely an embedded Product consumer
    // before asserting that an incremental Product update refreshes it.
    assert.match(await readFile(path.join(dist, "index.html"), "utf8"), /Product A/);
    fixture.state.products[0] = { ...fixture.state.products[0], name: "Product A updated", price: "120" };
    const webhook = await runtime.services.webhookReceiver.handle(workspace.siteId, uuid, {
      body: { action: "update", changed: [{ id: 101, slug: "product-a", type: "product" }], eventId: "c026-product-101-update-1", source: "woocommerce" },
      headers: { "x-wpsc-webhook-secret": secret }, method: "POST"
    });
    assert.equal(webhook.status, 202);
    const tick = await runtime.services.scheduler.tick();
    assert.equal(tick.dispatched.build.status, "SUCCESS", JSON.stringify(tick.diagnostics));
    assert.match(await readFile(path.join(dist, "product-a", "index.html"), "utf8"), /Product A updated/);
    assert.match(await readFile(path.join(dist, "featured", "index.html"), "utf8"), /Product A updated/);
    assert.match(await readFile(path.join(dist, "index.html"), "utf8"), /Product A updated/);
    const manifest = JSON.parse(await readFile(path.join(workspace.repository.resolveSiteRoot(workspace.siteId), "storage", "build", "dependency-manifest.json"), "utf8"));
    // The manifest stores WPSC Content IDs (`product-101`) and public slugs;
    // `101` is the provider ID kept separately as woocommerceProductId.
    const affectedRoutes = manifest.contentToRoutes["product:product-a"];
    assert.ok(Array.isArray(affectedRoutes), "Product slug must resolve to a persisted dependency entry.");
    assert.ok(affectedRoutes.includes("/product-a"));
    assert.ok(affectedRoutes.includes("/featured"));
    assert.ok(affectedRoutes.includes("/"));
    const history = JSON.parse(await readFile(path.join(workspace.repository.resolveSiteRoot(workspace.siteId), "storage", "build", "history.json"), "utf8"));
    assert.equal(history.entries.at(-1).mode, "incremental");
  } finally { await Promise.all([fixture.close(), workspace.cleanup()]); }
});

test("C026 Phase 7 persists a dependency snapshot only after Runtime publish", { timeout: 30_000 }, async () => {
  const workspace = await createRuntimeWorkspace();
  const fixture = await createWordPressWooCommerceRestFixture();
  const uuid = "d8476e65-985e-4330-836e-e5e0d12a4811";
  try {
    await createSiteRuntimeSkeleton({ repository: workspace.repository, siteId: workspace.siteId, uuid });
    await workspace.repository.writeSourceMetadata(workspace.siteId, { adapterVersion: "1.0", capabilities: ["supportsWebhook", "supportsWooCommerce"], endpoint: fixture.baseUrl, schema: "source-metadata", schemaVersion: 1, sourceType: "wordpress-woocommerce" });
    await createSourceCredentialStore({ repository: workspace.repository }).write(workspace.siteId, { applicationPassword: fixture.applicationPassword, woocommerceConsumerKey: fixture.consumerKey, woocommerceConsumerSecret: fixture.consumerSecret, wordpressUsername: fixture.username });
    const adapterLoader = createSourceAdapterLoader({ registry: createSourceRegistry({ adapters: [{ type: "wordpress-woocommerce", create: (options) => createWordPressSourceAdapter({ ...options, sourceType: "wordpress-woocommerce" }) }] }) });
    const runtime = createSiteRuntimeInstance({ adapterLoader, domains: { "woo-e2e.fixture.test": workspace.siteId }, repository: workspace.repository, webhookBaseUrl: "https://runtime.fixture.test/webhook" });
    runtime.services.scheduler.trigger({ changed: [], siteId: workspace.siteId, triggerType: "manual" });
    const tick = await runtime.services.scheduler.tick();
    assert.equal(tick.dispatched.build.status, "SUCCESS", JSON.stringify(tick.diagnostics));
    const manifest = JSON.parse(await readFile(path.join(workspace.repository.resolveSiteRoot(workspace.siteId), "storage", "build", "dependency-manifest.json"), "utf8"));
    assert.equal(manifest.schema, "wpsc.route-dependencies");
    assert.equal(manifest.schemaVersion, 1);
    assert.equal(manifest.siteId, workspace.siteId);
    assert.equal(manifest.buildId, tick.dispatched.build.buildId);
    assert.ok(Array.isArray(manifest.contentToRoutes["product:product-a"]));
    assert.ok(manifest.contentToRoutes["product:product-a"].includes("/product-a"));
    assert.ok(manifest.contentToRoutes["product:product-a"].includes("/featured"));
    assert.ok(manifest.contentToRoutes["product:product-a"].includes("/"));
    assert.ok(manifest.routeToDependencies["/"].includes("product:product-a"));
  } finally { await Promise.all([fixture.close(), workspace.cleanup()]); }
});

test("C026 Phase 8 accepts a Product webhook and completes its Runtime Job lifecycle", { timeout: 30_000 }, async () => {
  const workspace = await createRuntimeWorkspace();
  const fixture = await createWordPressWooCommerceRestFixture();
  const uuid = "dc9c2378-a55a-4e5b-9b86-87d8b7f0830c";
  const secret = "c026-phase-8-webhook-secret";
  try {
    await createSiteRuntimeSkeleton({ repository: workspace.repository, siteId: workspace.siteId, uuid });
    await workspace.repository.writeSourceMetadata(workspace.siteId, { adapterVersion: "1.0", capabilities: ["supportsWebhook", "supportsWooCommerce"], endpoint: fixture.baseUrl, schema: "source-metadata", schemaVersion: 1, sourceType: "wordpress-woocommerce" });
    await createSourceCredentialStore({ repository: workspace.repository }).write(workspace.siteId, { applicationPassword: fixture.applicationPassword, woocommerceConsumerKey: fixture.consumerKey, woocommerceConsumerSecret: fixture.consumerSecret, wordpressUsername: fixture.username });
    await writeFile(path.join(workspace.repository.resolveSiteRoot(workspace.siteId), "config", "webhook.json"), `${JSON.stringify({ secret, uuid })}\n`);
    const adapterLoader = createSourceAdapterLoader({ registry: createSourceRegistry({ adapters: [{ type: "wordpress-woocommerce", create: (options) => createWordPressSourceAdapter({ ...options, sourceType: "wordpress-woocommerce" }) }] }) });
    const runtime = createSiteRuntimeInstance({ adapterLoader, domains: { "woo-e2e.fixture.test": workspace.siteId }, repository: workspace.repository, webhookBaseUrl: "https://runtime.fixture.test/webhook" });
    runtime.services.scheduler.trigger({ changed: [], siteId: workspace.siteId, triggerType: "manual" });
    assert.equal((await runtime.services.scheduler.tick()).dispatched.build.status, "SUCCESS");
    const received = await runtime.services.webhookReceiver.handle(workspace.siteId, uuid, {
      body: { action: "update", changed: [{ id: 101, slug: "product-a", type: "product" }], eventId: "c026-phase-8-product-101", source: "woocommerce" },
      headers: { "x-wpsc-webhook-secret": secret }, method: "POST"
    });
    assert.equal(received.status, 202);
    assert.equal(received.body.changed[0], "product:product-a");
    const pending = runtime.services.queue.list(JobStatus.QUEUED);
    assert.equal(pending.length, 1);
    assert.equal(pending[0].id, received.body.jobId);
    assert.equal(pending[0].triggerType, JobTrigger.WEBHOOK);
    assert.equal(pending[0].changes[0].entityType, "product");
    const tick = await runtime.services.scheduler.tick();
    assert.equal(tick.dispatched.job.id, received.body.jobId);
    assert.equal(tick.dispatched.build.status, "SUCCESS", JSON.stringify(tick.diagnostics));
    const completed = runtime.services.queue.list(JobStatus.SUCCESS);
    assert.ok(completed.some((job) => job.id === received.body.jobId && job.triggerType === JobTrigger.WEBHOOK));
    assert.equal(runtime.services.queue.list(JobStatus.QUEUED).length, 0);
  } finally { await Promise.all([fixture.close(), workspace.cleanup()]); }
});

test("C026 Phase 9 fetches changed Product data from the WooCommerce HTTP source", async () => {
  const fixture = await createWordPressWooCommerceRestFixture();
  try {
    const adapter = createWordPressSourceAdapter({
      credentials: {
        applicationPassword: fixture.applicationPassword,
        woocommerceConsumerKey: fixture.consumerKey,
        woocommerceConsumerSecret: fixture.consumerSecret,
        wordpressUsername: fixture.username
      },
      sourceType: "wordpress-woocommerce"
    });
    await adapter.initialize({ endpoint: fixture.baseUrl, siteId: "woo-e2e-site" });
    // Change only the provider's HTTP fixture state. No normalized Product or
    // Build input is injected into the Source Adapter or Runtime.
    fixture.state.products[0] = { ...fixture.state.products[0], name: "Product A Updated", price: "120" };
    const changed = await adapter.getContentsByChanges([{ id: "101", routeSlug: "product-a", type: "product" }]);
    assert.equal(changed.length, 1);
    assert.equal(changed[0].title, "Product A Updated");
    assert.equal(changed[0].data.price, 120);
    assert.ok(fixture.requests.some((request) => request.woo && request.url.includes("products?")));
  } finally { await fixture.close(); }
});

test("C026 Phase 10 advances a changed Product webhook through the Scheduler lifecycle", { timeout: 30_000 }, async () => {
  const workspace = await createRuntimeWorkspace();
  const fixture = await createWordPressWooCommerceRestFixture();
  const uuid = "8e1c5d73-90bf-4c91-a833-78c93d3d649c";
  const secret = "c026-phase-10-webhook-secret";
  try {
    await createSiteRuntimeSkeleton({ repository: workspace.repository, siteId: workspace.siteId, uuid });
    await workspace.repository.writeSourceMetadata(workspace.siteId, { adapterVersion: "1.0", capabilities: ["supportsWebhook", "supportsWooCommerce"], endpoint: fixture.baseUrl, schema: "source-metadata", schemaVersion: 1, sourceType: "wordpress-woocommerce" });
    await createSourceCredentialStore({ repository: workspace.repository }).write(workspace.siteId, { applicationPassword: fixture.applicationPassword, woocommerceConsumerKey: fixture.consumerKey, woocommerceConsumerSecret: fixture.consumerSecret, wordpressUsername: fixture.username });
    await writeFile(path.join(workspace.repository.resolveSiteRoot(workspace.siteId), "config", "webhook.json"), `${JSON.stringify({ secret, uuid })}\n`);
    const adapterLoader = createSourceAdapterLoader({ registry: createSourceRegistry({ adapters: [{ type: "wordpress-woocommerce", create: (options) => createWordPressSourceAdapter({ ...options, sourceType: "wordpress-woocommerce" }) }] }) });
    const runtime = createSiteRuntimeInstance({ adapterLoader, domains: { "woo-e2e.fixture.test": workspace.siteId }, repository: workspace.repository, webhookBaseUrl: "https://runtime.fixture.test/webhook" });
    runtime.services.scheduler.trigger({ changed: [], siteId: workspace.siteId, triggerType: "manual" });
    assert.equal((await runtime.services.scheduler.tick()).dispatched.build.status, "SUCCESS");
    fixture.state.products[0] = { ...fixture.state.products[0], name: "Product A Updated", price: "120" };
    const accepted = await runtime.services.webhookReceiver.handle(workspace.siteId, uuid, {
      body: { action: "update", changed: [{ id: 101, slug: "product-a", type: "product" }], eventId: "c026-phase-10-product-101", source: "woocommerce" },
      headers: { "x-wpsc-webhook-secret": secret }, method: "POST"
    });
    assert.equal(accepted.status, 202);
    const tick = await runtime.services.scheduler.tick();
    assert.equal(tick.ok, true, JSON.stringify(tick.diagnostics));
    assert.equal(tick.dispatched.job.id, accepted.body.jobId);
    assert.equal(tick.dispatched.job.triggerType, JobTrigger.WEBHOOK);
    assert.equal(tick.dispatched.build.status, "SUCCESS");
    assert.ok(tick.events.some((event) => event.type === "scheduler.tick"));
    const finished = runtime.services.queue.list(JobStatus.SUCCESS).find((job) => job.id === accepted.body.jobId);
    assert.equal(finished.status, JobStatus.SUCCESS);
    assert.equal(finished.changes[0].entityType, "product");
  } finally { await Promise.all([fixture.close(), workspace.cleanup()]); }
});

test("C026 Phase 11 publishes changed Product output incrementally to every affected route", { timeout: 30_000 }, async () => {
  const workspace = await createRuntimeWorkspace();
  const fixture = await createWordPressWooCommerceRestFixture();
  const uuid = "5ef0bc50-a103-48d4-9b7d-dedb8252d64f";
  const secret = "c026-phase-11-webhook-secret";
  try {
    await createSiteRuntimeSkeleton({ repository: workspace.repository, siteId: workspace.siteId, uuid });
    await workspace.repository.writeSourceMetadata(workspace.siteId, { adapterVersion: "1.0", capabilities: ["supportsWebhook", "supportsWooCommerce"], endpoint: fixture.baseUrl, schema: "source-metadata", schemaVersion: 1, sourceType: "wordpress-woocommerce" });
    await createSourceCredentialStore({ repository: workspace.repository }).write(workspace.siteId, { applicationPassword: fixture.applicationPassword, woocommerceConsumerKey: fixture.consumerKey, woocommerceConsumerSecret: fixture.consumerSecret, wordpressUsername: fixture.username });
    await writeFile(path.join(workspace.repository.resolveSiteRoot(workspace.siteId), "config", "webhook.json"), `${JSON.stringify({ secret, uuid })}\n`);
    const adapterLoader = createSourceAdapterLoader({ registry: createSourceRegistry({ adapters: [{ type: "wordpress-woocommerce", create: (options) => createWordPressSourceAdapter({ ...options, sourceType: "wordpress-woocommerce" }) }] }) });
    const runtime = createSiteRuntimeInstance({ adapterLoader, domains: { "woo-e2e.fixture.test": workspace.siteId }, repository: workspace.repository, webhookBaseUrl: "https://runtime.fixture.test/webhook" });
    runtime.services.scheduler.trigger({ changed: [], siteId: workspace.siteId, triggerType: "manual" });
    assert.equal((await runtime.services.scheduler.tick()).dispatched.build.status, "SUCCESS");
    const dist = path.join(workspace.repository.resolveSiteRoot(workspace.siteId), "public", "dist");
    const before = await Promise.all(["index.html", "product-a/index.html", "featured/index.html"].map((file) => readFile(path.join(dist, file), "utf8")));
    fixture.state.products[0] = { ...fixture.state.products[0], name: "Product A Updated", price: "120" };
    const accepted = await runtime.services.webhookReceiver.handle(workspace.siteId, uuid, {
      body: { action: "update", changed: [{ id: 101, slug: "product-a", type: "product" }], eventId: "c026-phase-11-product-101", source: "woocommerce" },
      headers: { "x-wpsc-webhook-secret": secret }, method: "POST"
    });
    assert.equal(accepted.status, 202);
    assert.equal((await runtime.services.scheduler.tick()).dispatched.build.status, "SUCCESS");
    const after = await Promise.all(["index.html", "product-a/index.html", "featured/index.html"].map((file) => readFile(path.join(dist, file), "utf8")));
    for (const output of after) assert.match(output, /Product A Updated/);
    assert.ok(after.every((output, index) => output !== before[index]), "Every affected public route must be republished.");
    const history = JSON.parse(await readFile(path.join(workspace.repository.resolveSiteRoot(workspace.siteId), "storage", "build", "history.json"), "utf8"));
    const latest = history.entries.at(-1);
    assert.equal(latest.mode, "incremental");
    assert.ok(latest.changedRoutes.includes("/product-a"));
    assert.ok(latest.changedRoutes.includes("/featured"));
    assert.ok(latest.changedRoutes.includes("/"));
  } finally { await Promise.all([fixture.close(), workspace.cleanup()]); }
});

test("C026 Phase 12 accepts the verified public snapshot after incremental publish", { timeout: 30_000 }, async () => {
  const workspace = await createRuntimeWorkspace();
  const fixture = await createWordPressWooCommerceRestFixture();
  const uuid = "17739894-73a0-4fb0-b20e-416b1bb9f876";
  const secret = "c026-phase-12-webhook-secret";
  try {
    await createSiteRuntimeSkeleton({ repository: workspace.repository, siteId: workspace.siteId, uuid });
    await workspace.repository.writeSourceMetadata(workspace.siteId, { adapterVersion: "1.0", capabilities: ["supportsWebhook", "supportsWooCommerce"], endpoint: fixture.baseUrl, schema: "source-metadata", schemaVersion: 1, sourceType: "wordpress-woocommerce" });
    await createSourceCredentialStore({ repository: workspace.repository }).write(workspace.siteId, { applicationPassword: fixture.applicationPassword, woocommerceConsumerKey: fixture.consumerKey, woocommerceConsumerSecret: fixture.consumerSecret, wordpressUsername: fixture.username });
    await writeFile(path.join(workspace.repository.resolveSiteRoot(workspace.siteId), "config", "webhook.json"), `${JSON.stringify({ secret, uuid })}\n`);
    const adapterLoader = createSourceAdapterLoader({ registry: createSourceRegistry({ adapters: [{ type: "wordpress-woocommerce", create: (options) => createWordPressSourceAdapter({ ...options, sourceType: "wordpress-woocommerce" }) }] }) });
    const runtime = createSiteRuntimeInstance({ adapterLoader, domains: { "woo-e2e.fixture.test": workspace.siteId }, repository: workspace.repository, webhookBaseUrl: "https://runtime.fixture.test/webhook" });
    runtime.services.scheduler.trigger({ changed: [], siteId: workspace.siteId, triggerType: "manual" });
    assert.equal((await runtime.services.scheduler.tick()).dispatched.build.status, "SUCCESS");
    const dist = path.join(workspace.repository.resolveSiteRoot(workspace.siteId), "public", "dist");
    fixture.state.products[0] = { ...fixture.state.products[0], name: "Product A Updated", price: "120" };
    fixture.state.variations[101] = fixture.state.variations[101].map((variation) => ({ ...variation, price: "120" }));
    const accepted = await runtime.services.webhookReceiver.handle(workspace.siteId, uuid, {
      body: { action: "update", changed: [{ id: 101, slug: "product-a", type: "product" }], eventId: "c026-phase-12-product-101", source: "woocommerce" },
      headers: { "x-wpsc-webhook-secret": secret }, method: "POST"
    });
    assert.equal(accepted.status, 202);
    assert.equal((await runtime.services.scheduler.tick()).dispatched.build.status, "SUCCESS");
    const outputs = await Promise.all(["index.html", "product-a/index.html", "featured/index.html"].map((file) => readFile(path.join(dist, file), "utf8")));
    for (const html of outputs) {
      assert.match(html, /Product A Updated/);
      assert.match(html, /120/);
      assert.ok(!html.includes(">Product A<"), "Old Product title must not remain in an affected HTML route.");
      assert.doesNotMatch(html, /100(?:&nbsp;|\u00a0|\s)*₫/u, "Old Product price must not remain in an affected HTML route.");
    }
    const productData = JSON.parse(await readFile(path.join(dist, "data", "routes", "product-a.json"), "utf8"));
    assert.equal(productData.content.commerce.price, 120);
    assert.ok(productData.content.variants.every((variant) => variant.price === 120));
    const manifest = JSON.parse(await readFile(path.join(dist, ".wpsc", "manifest.json"), "utf8"));
    const routeData = JSON.parse(await readFile(path.join(dist, "data", "manifest.json"), "utf8"));
    assert.ok(Array.isArray(manifest.routes));
    assert.ok(Array.isArray(routeData.routes));
    for (const route of [...manifest.routes, ...routeData.routes]) await access(path.join(dist, route.outputPath));
    await Promise.all([".wpsc/routes.json", ".wpsc/media.json"].map((file) => readFile(path.join(dist, file), "utf8").then(JSON.parse)));
  } finally { await Promise.all([fixture.close(), workspace.cleanup()]); }
});

test("C026 Phase 13 preserves an unrelated public route during Product incremental publish", { timeout: 30_000 }, async () => {
  const workspace = await createRuntimeWorkspace();
  const fixture = await createWordPressWooCommerceRestFixture();
  const uuid = "754885c5-3f41-4c45-b14e-4c541d13022a";
  const secret = "c026-phase-13-webhook-secret";
  try {
    fixture.state.pages.push({ content: { rendered: "<p>Independent company information.</p>" }, excerpt: { rendered: "" }, id: 2, slug: "about", title: { rendered: "About" } });
    await createSiteRuntimeSkeleton({ repository: workspace.repository, siteId: workspace.siteId, uuid });
    await workspace.repository.writeSourceMetadata(workspace.siteId, { adapterVersion: "1.0", capabilities: ["supportsWebhook", "supportsWooCommerce"], endpoint: fixture.baseUrl, schema: "source-metadata", schemaVersion: 1, sourceType: "wordpress-woocommerce" });
    await createSourceCredentialStore({ repository: workspace.repository }).write(workspace.siteId, { applicationPassword: fixture.applicationPassword, woocommerceConsumerKey: fixture.consumerKey, woocommerceConsumerSecret: fixture.consumerSecret, wordpressUsername: fixture.username });
    await writeFile(path.join(workspace.repository.resolveSiteRoot(workspace.siteId), "config", "webhook.json"), `${JSON.stringify({ secret, uuid })}\n`);
    const adapterLoader = createSourceAdapterLoader({ registry: createSourceRegistry({ adapters: [{ type: "wordpress-woocommerce", create: (options) => createWordPressSourceAdapter({ ...options, sourceType: "wordpress-woocommerce" }) }] }) });
    const runtime = createSiteRuntimeInstance({ adapterLoader, domains: { "woo-e2e.fixture.test": workspace.siteId }, repository: workspace.repository, webhookBaseUrl: "https://runtime.fixture.test/webhook" });
    runtime.services.scheduler.trigger({ changed: [], siteId: workspace.siteId, triggerType: "manual" });
    assert.equal((await runtime.services.scheduler.tick()).dispatched.build.status, "SUCCESS");
    const dist = path.join(workspace.repository.resolveSiteRoot(workspace.siteId), "public", "dist");
    const before = await readFile(path.join(dist, "about", "index.html"), "utf8");
    fixture.state.products[0] = { ...fixture.state.products[0], name: "Product A Updated", price: "120" };
    const accepted = await runtime.services.webhookReceiver.handle(workspace.siteId, uuid, {
      body: { action: "update", changed: [{ id: 101, slug: "product-a", type: "product" }], eventId: "c026-phase-13-product-101", source: "woocommerce" },
      headers: { "x-wpsc-webhook-secret": secret }, method: "POST"
    });
    assert.equal(accepted.status, 202);
    assert.equal((await runtime.services.scheduler.tick()).dispatched.build.status, "SUCCESS");
    const after = await readFile(path.join(dist, "about", "index.html"), "utf8");
    assert.equal(after, before);
    assert.match(after, /Independent company information/);
    const history = JSON.parse(await readFile(path.join(workspace.repository.resolveSiteRoot(workspace.siteId), "storage", "build", "history.json"), "utf8"));
    assert.equal(history.entries.at(-1).mode, "incremental");
    assert.ok(!history.entries.at(-1).changedRoutes.includes("/about"));
  } finally { await Promise.all([fixture.close(), workspace.cleanup()]); }
});

test("C026 Phase 14 runs Page, Post, Taxonomy and Media mutations through isolated Runtime scenarios", { timeout: 90_000 }, async () => {
  const scenarios = [];
  try {
    const page = await createPublishedWooRuntimeScenario({ prepare(state) { state.pages.push({ content: { rendered: "<p>Before page update</p>" }, excerpt: { rendered: "" }, id: 2, slug: "about", title: { rendered: "About" } }); } });
    scenarios.push(page);
    page.fixture.state.pages[1] = { ...page.fixture.state.pages[1], content: { rendered: "<p>After page update</p>" }, title: { rendered: "About Updated" } };
    await completeWebhookScenario(page, { action: "update", changed: [{ id: 2, slug: "about", type: "page" }], eventId: "c026-matrix-page", source: "wordpress" });
    assert.match(await readFile(path.join(page.dist, "about", "index.html"), "utf8"), /After page update/);
    await closeScenario(page); scenarios.pop();

    const post = await createPublishedWooRuntimeScenario({ prepare(state) { state.posts.push({ content: { rendered: "<p>Before post update</p>" }, excerpt: { rendered: "" }, id: 3, slug: "news", title: { rendered: "News" } }); } });
    scenarios.push(post);
    post.fixture.state.posts[0] = { ...post.fixture.state.posts[0], content: { rendered: "<p>After post update</p>" }, title: { rendered: "News Updated" } };
    await completeWebhookScenario(post, { action: "update", changed: [{ id: 3, slug: "news", type: "post" }], eventId: "c026-matrix-post", source: "wordpress" });
    assert.match(await readFile(path.join(post.dist, "news", "index.html"), "utf8"), /News Updated/);
    const postRouteData = JSON.parse(await readFile(path.join(post.dist, "data", "routes", "news.json"), "utf8"));
    assert.match(postRouteData.content.content, /After post update/);
    await closeScenario(post); scenarios.pop();

    const taxonomy = await createPublishedWooRuntimeScenario();
    scenarios.push(taxonomy);
    taxonomy.fixture.state.productCategories[0] = { ...taxonomy.fixture.state.productCategories[0], name: "Featured Updated" };
    taxonomy.fixture.state.products[0] = { ...taxonomy.fixture.state.products[0], categories: [{ ...taxonomy.fixture.state.products[0].categories[0], name: "Featured Updated" }] };
    await completeWebhookScenario(taxonomy, { action: "update", changed: [{ id: 7, slug: "featured", taxonomy: "product_cat", type: "term" }], eventId: "c026-matrix-taxonomy", source: "woocommerce" });
    assert.match(await readFile(path.join(taxonomy.dist, "featured", "index.html"), "utf8"), /Featured Updated/);
    await closeScenario(taxonomy); scenarios.pop();

    const media = await createPublishedWooRuntimeScenario({ configureFixture(fixture) {
      fixture.state.products[0] = { ...fixture.state.products[0], images: [{ alt: "Initial product image", id: 21, src: `${fixture.baseUrl}/media/product-a-before.png` }] };
      fixture.state.media = [{ alt_text: "Initial product image", id: 21, media_details: { height: 1, sizes: {}, width: 1 }, mime_type: "image/png", source_url: `${fixture.baseUrl}/media/product-a-before.png`, title: { rendered: "Initial product image" } }];
    } });
    scenarios.push(media);
    media.fixture.state.products[0] = { ...media.fixture.state.products[0], images: [{ alt: "Updated product image", id: 21, src: `${media.fixture.baseUrl}/media/product-a-after.png` }] };
    media.fixture.state.media[0] = { ...media.fixture.state.media[0], alt_text: "Updated product image", source_url: `${media.fixture.baseUrl}/media/product-a-after.png`, title: { rendered: "Updated product image" } };
    await completeWebhookScenario(media, { action: "update", changed: [{ id: 21, slug: "product-a-after", type: "media" }], eventId: "c026-matrix-media", source: "wordpress" });
    assert.match(await readFile(path.join(media.dist, "product-a", "index.html"), "utf8"), /product-a-after/);
    const mediaManifest = JSON.parse(await readFile(path.join(media.dist, ".wpsc", "media.json"), "utf8"));
    assert.ok(mediaManifest.media.some((item) => String(item.sourceUrl || item.url || "").includes("product-a-after.png")));
    await closeScenario(media); scenarios.pop();
  } finally { await Promise.all(scenarios.map(closeScenario)); }
});

test("C026 Phase 15 deletes stale Product public output through the destructive Runtime path", { timeout: 30_000 }, async () => {
  const scenario = await createPublishedWooRuntimeScenario({ uuid: "c92e1702-3b7d-4095-af6e-9adc163e0d45", secret: "c026-phase-15-webhook-secret" });
  try {
    await access(path.join(scenario.dist, "product-a", "index.html"));
    scenario.fixture.state.products = [];
    scenario.fixture.state.variations = {};
    const tick = await completeWebhookScenario(scenario, {
      action: "delete", changed: [{ id: 101, slug: "product-a", type: "product" }], eventId: "c026-phase-15-product-101", source: "woocommerce"
    });
    await assert.rejects(access(path.join(scenario.dist, "product-a", "index.html")));
    const search = JSON.parse(await readFile(path.join(scenario.dist, "data", "search-index.json"), "utf8"));
    assert.ok(!search.items.some((item) => item.slug === "product-a"));
    const sitemap = await readFile(path.join(scenario.dist, "sitemap.xml"), "utf8");
    assert.ok(!sitemap.includes("/product-a"));
    const dependency = JSON.parse(await readFile(path.join(scenario.workspace.repository.resolveSiteRoot(scenario.siteId), "storage", "build", "dependency-manifest.json"), "utf8"));
    assert.equal(dependency.contentToRoutes["product:product-a"], undefined);
    assert.ok(!Object.values(dependency.routeToDependencies).flat().includes("product:product-a"));
    const history = JSON.parse(await readFile(path.join(scenario.workspace.repository.resolveSiteRoot(scenario.siteId), "storage", "build", "history.json"), "utf8"));
    assert.equal(history.entries.at(-1).mode, "full");
    assert.equal(tick.dispatched.build.status, "SUCCESS");
  } finally { await closeScenario(scenario); }
});

test("C026 Phase 16 publishes a Product slug transition with the frozen browser redirect fallback", { timeout: 30_000 }, async () => {
  const scenario = await createPublishedWooRuntimeScenario({ uuid: "08322437-a5ed-44d8-b8d4-9203a155dad9", secret: "c026-phase-16-webhook-secret" });
  try {
    await access(path.join(scenario.dist, "product-a", "index.html"));
    scenario.fixture.state.products[0] = { ...scenario.fixture.state.products[0], name: "Product A Renamed", slug: "product-a-new" };
    const tick = await completeWebhookScenario(scenario, {
      action: "update", changed: [{ id: 101, previousSlug: "product-a", slug: "product-a-new", type: "product" }], eventId: "c026-phase-16-product-101", source: "woocommerce"
    });
    const newRoute = await readFile(path.join(scenario.dist, "product-a-new", "index.html"), "utf8");
    assert.match(newRoute, /Product A Renamed/);
    const oldRoute = await readFile(path.join(scenario.dist, "product-a", "index.html"), "utf8");
    assert.match(oldRoute, /product-a-new/);
    const routes = JSON.parse(await readFile(path.join(scenario.dist, ".wpsc", "routes.json"), "utf8"));
    assert.ok(routes.routes.some((route) => route.path === "/product-a-new"));
    assert.ok(!routes.routes.some((route) => route.path === "/product-a"));
    assert.ok(routes.redirects.some((redirect) => redirect.from === "/product-a" && redirect.to === "/product-a-new" && redirect.status === 301));
    const search = JSON.parse(await readFile(path.join(scenario.dist, "data", "search-index.json"), "utf8"));
    assert.ok(search.items.some((item) => item.slug === "product-a-new"));
    assert.ok(!search.items.some((item) => item.slug === "product-a"));
    const sitemap = await readFile(path.join(scenario.dist, "sitemap.xml"), "utf8");
    assert.ok(sitemap.includes("/product-a-new"));
    assert.ok(!sitemap.includes("/product-a</loc>"));
    const dependency = JSON.parse(await readFile(path.join(scenario.workspace.repository.resolveSiteRoot(scenario.siteId), "storage", "build", "dependency-manifest.json"), "utf8"));
    assert.ok(dependency.contentToRoutes["product:product-a-new"].includes("/product-a-new"));
    assert.equal(dependency.contentToRoutes["product:product-a"], undefined);
    const history = JSON.parse(await readFile(path.join(scenario.workspace.repository.resolveSiteRoot(scenario.siteId), "storage", "build", "history.json"), "utf8"));
    assert.equal(history.entries.at(-1).mode, "full");
    assert.equal(tick.dispatched.build.status, "SUCCESS");
  } finally { await closeScenario(scenario); }
});

test("C026 Phase 17 preserves the verified public snapshot on source failure and recovers on a new webhook", { timeout: 30_000 }, async () => {
  const scenario = await createPublishedWooRuntimeScenario({ uuid: "f0903d4e-68d6-4c63-91cf-c215a493926c", secret: "c026-phase-17-webhook-secret" });
  try {
    const productPath = path.join(scenario.dist, "product-a", "index.html");
    const verifiedBeforeFailure = await readFile(productPath, "utf8");
    scenario.fixture.state.products[0] = { ...scenario.fixture.state.products[0], name: "Product A Recovered", price: "120" };
    scenario.fixture.state.failNextWoo = true;
    const failed = await scenario.runtime.services.webhookReceiver.handle(scenario.siteId, scenario.uuid, {
      body: { action: "update", changed: [{ id: 101, slug: "product-a", type: "product" }], eventId: "c026-phase-17-failure", source: "woocommerce" },
      headers: { "x-wpsc-webhook-secret": scenario.secret }, method: "POST"
    });
    assert.equal(failed.status, 202);
    const failedTick = await scenario.runtime.services.scheduler.tick();
    assert.equal(failedTick.dispatched.build.status, "FAILED");
    assert.equal(await readFile(productPath, "utf8"), verifiedBeforeFailure);
    const recovered = await scenario.runtime.services.webhookReceiver.handle(scenario.siteId, scenario.uuid, {
      body: { action: "update", changed: [{ id: 101, slug: "product-a", type: "product" }], eventId: "c026-phase-17-recovery", source: "woocommerce" },
      headers: { "x-wpsc-webhook-secret": scenario.secret }, method: "POST"
    });
    assert.equal(recovered.status, 202);
    const recoveredTick = await scenario.runtime.services.scheduler.tick();
    assert.equal(recoveredTick.dispatched.build.status, "SUCCESS", JSON.stringify(recoveredTick.diagnostics));
    assert.match(await readFile(productPath, "utf8"), /Product A Recovered/);
    const finished = scenario.runtime.services.queue.list(JobStatus.FAILED);
    assert.ok(finished.some((job) => job.id === failed.body.jobId));
    assert.ok(scenario.runtime.services.queue.list(JobStatus.SUCCESS).some((job) => job.id === recovered.body.jobId));
  } finally { await closeScenario(scenario); }
});

test("C026 Phase 18 records full and incremental Runtime benchmark evidence", { timeout: 60_000 }, async (t) => {
  const scenario = await createPublishedWooRuntimeScenario({
    uuid: "bbe7d979-35b1-4fe3-8b47-485c2bfd0144",
    secret: "c026-phase-18-webhook-secret",
    prepare(state) { state.pages.push({ content: { rendered: "<p>Benchmark page before update</p>" }, excerpt: { rendered: "" }, id: 2, slug: "about", title: { rendered: "About" } }); }
  });
  try {
    scenario.fixture.state.products[0] = { ...scenario.fixture.state.products[0], name: "Product A Benchmark", price: "120" };
    await completeWebhookScenario(scenario, { action: "update", changed: [{ id: 101, slug: "product-a", type: "product" }], eventId: "c026-benchmark-product", source: "woocommerce" });
    scenario.fixture.state.pages[1] = { ...scenario.fixture.state.pages[1], content: { rendered: "<p>Benchmark page after update</p>" }, title: { rendered: "About Benchmark" } };
    await completeWebhookScenario(scenario, { action: "update", changed: [{ id: 2, slug: "about", type: "page" }], eventId: "c026-benchmark-page", source: "wordpress" });
    scenario.fixture.state.productCategories[0] = { ...scenario.fixture.state.productCategories[0], name: "Featured Benchmark" };
    scenario.fixture.state.products[0] = { ...scenario.fixture.state.products[0], categories: [{ ...scenario.fixture.state.products[0].categories[0], name: "Featured Benchmark" }] };
    await completeWebhookScenario(scenario, { action: "update", changed: [{ id: 7, slug: "featured", taxonomy: "product_cat", type: "term" }], eventId: "c026-benchmark-taxonomy", source: "woocommerce" });
    const history = JSON.parse(await readFile(path.join(scenario.workspace.repository.resolveSiteRoot(scenario.siteId), "storage", "build", "history.json"), "utf8"));
    assert.equal(history.entries.length, 4);
    assert.equal(history.entries[0].mode, "full");
    for (const entry of history.entries) {
      assert.ok(Number.isFinite(entry.duration) && entry.duration >= 0);
      assert.ok(Number.isFinite(entry.phases.source) && entry.phases.source >= 0);
      assert.ok(Number.isFinite(entry.phases.build) && entry.phases.build >= 0);
      assert.ok(Number.isFinite(entry.phases.publish) && entry.phases.publish >= 0);
      assert.ok(Array.isArray(entry.changedRoutes));
    }
    assert.deepEqual(history.entries.slice(1).map((entry) => entry.mode), ["incremental", "incremental", "incremental"]);
    const benchmark = history.entries.map((entry, index) => ({
      changedRoutes: entry.changedRoutes.length,
      durationMs: entry.duration,
      mode: entry.mode,
      pagesWritten: entry.pagesWritten,
      phasesMs: entry.phases,
      scenario: ["full", "product", "page", "taxonomy"][index],
      totalPages: entry.totalPages
    }));
    t.diagnostic(`C026 benchmark evidence: ${JSON.stringify(benchmark)}`);
  } finally { await closeScenario(scenario); }
});
