import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createSiteRuntimeInstance from "../framework/src/runtime/bootstrap/createSiteRuntimeInstance.js";
import { createSiteRuntimeSkeleton } from "../framework/src/runtime/bootstrap/createSiteRuntime.js";
import createSourceCredentialStore from "../framework/src/runtime/source/createSourceCredentialStore.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";
import createSourceAdapterLoader from "../framework/src/source/createSourceAdapterLoader.js";
import createSourceRegistry from "../framework/src/source/createSourceRegistry.js";
import createWordPressSourceAdapter from "../framework/src/source/createWordPressSourceAdapter.js";

function collection(items) {
  return {
    headers: new Headers({ "x-wp-totalpages": "1" }),
    ok: true,
    status: 200,
    statusText: "OK",
    text: async () => JSON.stringify(items)
  };
}

function wordpressContent({ postTitle = "Sprint 7 is ready" } = {}) {
  const author = { id: 4, name: "WPSC Editor", slug: "wpsc-editor" };
  const category = { count: 1, id: 7, name: "Updates", slug: "updates", taxonomy: "category" };
  const featuredMedia = {
    alt_text: "WPSC landscape",
    id: 21,
    media_details: {
      height: 900,
      sizes: {
        medium: {
          height: 300,
          source_url: "",
          width: 533
        }
      },
      width: 1600
    },
    mime_type: "image/jpeg",
    source_url: ""
  };
  return {
    authors: [author],
    categories: [category],
    media: [featuredMedia],
    menus: [{
      id: 1,
      items: [
        { id: 11, menu_item_parent: 0, menu_order: 1, title: "Home", url: "https://site.example.test/" },
        { id: 12, menu_item_parent: 0, menu_order: 2, title: "Updates", url: "https://site.example.test/category/updates/" }
      ],
      name: "Primary",
      slug: "primary"
    }],
    pages: [{
      _embedded: { author: [author], "wp:featuredmedia": [featuredMedia], "wp:term": [] },
      content: { rendered: "<p>The complete shared website services flow.</p>" },
      excerpt: { rendered: "Shared services" },
      id: 1,
      link: "https://cms.example.test/",
      slug: "homepage",
      status: "publish",
      title: { rendered: "WPSC Website" },
      type: "page"
    }],
    posts: [{
      _embedded: { author: [author], "wp:featuredmedia": [featuredMedia], "wp:term": [[category]] },
      content: { rendered: "<p>Published from WordPress through WPSC.</p>" },
      excerpt: { rendered: "Sprint 7 publication" },
      id: 12,
      link: "https://cms.example.test/sprint-7",
      slug: "sprint-7",
      status: "publish",
      title: { rendered: postTitle },
      type: "post"
    }],
    tags: []
  };
}

function createWordPressFetch(state) {
  return async (input) => {
    const pathname = new URL(String(input)).pathname;
    const key = pathname.split("/").filter(Boolean).at(-1);
    const items = state.current[key];
    return collection(Array.isArray(items) ? items : []);
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

test("Sprint 7 publishes a WordPress website and rebuilds it through the webhook pipeline", { timeout: 30_000 }, async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-sprint7-e2e-"));
  const repository = createSiteRepository({ workspaceDir });
  const siteId = "site-a";
  const untouchedSiteId = "site-b";
  const uuid = "de4ddfd7-8f4d-4a2d-b135-26f235e39b34";
  const webhookSecret = "sprint-7-e2e-secret";
  const state = { current: wordpressContent() };
  const registry = createSourceRegistry({
    adapters: [{
      create: (options) => createWordPressSourceAdapter({
        ...options,
        fetchImpl: createWordPressFetch(state),
        includeMedia: true,
        includeMenus: true
      }),
      type: "wordpress"
    }]
  });
  const adapterLoader = createSourceAdapterLoader({ registry });

  try {
    await createSiteRuntimeSkeleton({ repository, siteId, uuid });
    await createSiteRuntimeSkeleton({ repository, siteId: untouchedSiteId });
    await repository.writeSourceMetadata(siteId, {
      adapterVersion: "1.0",
      capabilities: ["supportsWebhook"],
      endpoint: "https://cms.example.test",
      schema: "source-metadata",
      schemaVersion: 1,
      sourceType: "wordpress"
    });
    await createSourceCredentialStore({ repository }).write(siteId, {
      applicationPassword: "test-application-password",
      wordpressUsername: "wpsc-editor"
    });
    await writeFile(
      path.join(repository.resolveSiteRoot(siteId), "config", "webhook.json"),
      `${JSON.stringify({ secret: webhookSecret, uuid }, null, 2)}\n`,
      "utf8"
    );

    const runtime = createSiteRuntimeInstance({
      adapterLoader,
      domains: {
        "a.example.test": siteId,
        "b.example.test": untouchedSiteId
      },
      repository,
      webhookBaseUrl: "https://runtime.example.test/webhook"
    });

    const queued = runtime.services.scheduler.trigger({
      changed: [],
      siteId,
      triggerType: "manual"
    });
    assert.equal(queued.ok, true);
    const firstTick = await runtime.services.scheduler.tick();
    assert.equal(firstTick.ok, true, JSON.stringify(firstTick.diagnostics));
    assert.equal(firstTick.dispatched.build.status, "SUCCESS");

    const dist = path.join(repository.resolveSiteRoot(siteId), "public", "dist");
    const initialPost = await readFile(path.join(dist, "sprint-7", "index.html"), "utf8");
    assert.match(initialPost, /Sprint 7 is ready/);
    assert.match(initialPost, /storefront\.css/);
    await access(path.join(dist, "storefront.css"));

    const search = await readJson(path.join(dist, "data", "search-index.json"));
    const media = await readJson(path.join(dist, ".wpsc", "media.json"));
    const routes = await readJson(path.join(dist, ".wpsc", "routes.json"));
    assert.equal(search.siteId, siteId);
    assert.ok(search.items.some((item) => item.slug === "sprint-7"));
    assert.equal(media.siteId, siteId);
    assert.ok(media.media.some((item) => String(item.id) === "21"));
    assert.equal(routes.siteId, siteId);
    assert.ok(routes.routes.some((route) => route.path.replace(/\/$/, "") === "/sprint-7"));

    state.current = wordpressContent({ postTitle: "Sprint 7 webhook update" });
    const webhook = await runtime.services.webhookReceiver.handle(siteId, uuid, {
      body: {
        action: "update",
        changed: [{ id: 12, postType: "post", slug: "sprint-7" }],
        eventId: "wordpress-post-12-update-1",
        source: "wordpress"
      },
      headers: { "x-wpsc-webhook-secret": webhookSecret },
      method: "POST"
    });
    assert.equal(webhook.status, 202);
    assert.deepEqual(webhook.body.changed, ["post:sprint-7"]);

    const publishTick = await runtime.services.scheduler.tick();
    assert.equal(publishTick.ok, true);
    assert.deepEqual(publishTick.dispatched.job.changed, ["post:sprint-7"]);
    assert.equal(publishTick.dispatched.build.status, "SUCCESS");
    assert.match(await readFile(path.join(dist, "sprint-7", "index.html"), "utf8"), /Sprint 7 webhook update/);

    // C026: duplicate delivery remains idempotent and deletion reconciles the
    // complete public snapshot rather than leaving stale route output.
    const duplicate = await runtime.services.webhookReceiver.handle(siteId, uuid, {
      body: { action: "update", changed: [{ id: 12, postType: "post", slug: "sprint-7" }], eventId: "wordpress-post-12-update-1", source: "wordpress" },
      headers: { "x-wpsc-webhook-secret": webhookSecret }, method: "POST"
    });
    assert.equal(duplicate.status, 202);
    assert.equal(duplicate.body.jobId, webhook.body.jobId);

    state.current = {
      ...state.current,
      posts: [{ ...state.current.posts[0], link: "https://cms.example.test/sprint-7-renamed", slug: "sprint-7-renamed" }]
    };
    const renamed = await runtime.services.webhookReceiver.handle(siteId, uuid, {
      body: { action: "update", changed: [{ id: 12, postType: "post", previousSlug: "sprint-7", slug: "sprint-7-renamed" }], eventId: "wordpress-post-12-rename-1", source: "wordpress" },
      headers: { "x-wpsc-webhook-secret": webhookSecret }, method: "POST"
    });
    assert.equal(renamed.status, 202);
    assert.equal((await runtime.services.scheduler.tick()).dispatched.build.status, "SUCCESS");
    assert.match(await readFile(path.join(dist, "sprint-7-renamed", "index.html"), "utf8"), /Sprint 7 webhook update/);
    assert.match(await readFile(path.join(dist, "sprint-7", "index.html"), "utf8"), /sprint-7-renamed/);

    state.current = { ...state.current, posts: [] };
    const deleted = await runtime.services.webhookReceiver.handle(siteId, uuid, {
      body: { action: "delete", changed: [{ id: 12, postType: "post", slug: "sprint-7-renamed" }], eventId: "wordpress-post-12-delete-1", source: "wordpress" },
      headers: { "x-wpsc-webhook-secret": webhookSecret }, method: "POST"
    });
    assert.equal(deleted.status, 202);
    const deleteTick = await runtime.services.scheduler.tick();
    assert.equal(deleteTick.dispatched.build.status, "SUCCESS");
    await assert.rejects(access(path.join(dist, "sprint-7-renamed", "index.html")));
    const afterDeleteSearch = await readJson(path.join(dist, "data", "search-index.json"));
    assert.equal(afterDeleteSearch.items.some((item) => item.slug === "sprint-7"), false);

    const siteBPublic = path.join(repository.resolveSiteRoot(untouchedSiteId), "public");
    await assert.rejects(access(path.join(siteBPublic, "dist")));
  } finally {
    await rm(workspaceDir, { force: true, recursive: true });
  }
});
