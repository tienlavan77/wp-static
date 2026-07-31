import assert from "node:assert/strict";
import test from "node:test";
import createWordPressSourceAdapter from "../framework/src/source/createWordPressSourceAdapter.js";
import { validateSourceAdapter } from "../framework/src/source/sourceAdapterContract.js";

function response(body = {}, status = 200) { return { ok: status >= 200 && status < 300, status, statusText: status === 200 ? "OK" : "Error", text: async () => JSON.stringify(body) }; }
function collectionResponse(body = []) { return { ...response(body), headers: new Headers({ "x-wp-totalpages": "1" }) }; }

test("WordPress Source Adapter implements Source lifecycle and configurable webhook bridge", async () => {
  const calls = [];
  const adapter = createWordPressSourceAdapter({
    auth: { password: "app-password", type: "applicationPassword", username: "editor" },
    fetchImpl: async (url, init = {}) => { calls.push([url, init.method || "GET"]); return response(url.endsWith("/config") ? { ok: true, webhookId: "wpsc-webhook-bridge" } : url.endsWith("/status") ? { enabled: true, secretConfigured: true, targetConfigured: true } : { ok: true }); },
    webhookSecret: "runtime-secret"
  });
  assert.equal(validateSourceAdapter(adapter).ok, true);
  assert.equal((await adapter.initialize({ endpoint: "https://cms.example.test/" })).ok, true);
  assert.equal((await adapter.validate()).ok, true);
  assert.deepEqual(await adapter.registerWebhook({ siteId: "company-a", webhookUrl: "https://site.example.test/webhook/id" }), { ok: true, webhookId: "wpsc-webhook-bridge" });
  assert.equal((await adapter.verifyWebhook({ webhookId: "wp-hook-1" })).ok, true);
  assert.equal(calls[0][0], "https://cms.example.test/wp-json/wp/v2/users/me");
  assert.equal(calls[1][0], "https://cms.example.test/wp-json/wpsc/v1/webhook/config");
  assert.equal(calls[2][0], "https://cms.example.test/wp-json/wpsc/v1/webhook/status");
  assert.equal(calls[3][0], "https://cms.example.test/wp-json/wpsc/v1/webhook/test");
});

test("WordPress Source Adapter preserves webhook bridge validation details", async () => {
  const adapter = createWordPressSourceAdapter({
    auth: { password: "app-password", type: "applicationPassword", username: "editor" },
    fetchImpl: async () => response({ code: "wpsc_webhook_target_invalid", message: "targetUrl must be a valid HTTP(S) URL." }, 400),
    webhookSecret: "runtime-secret"
  });
  await adapter.initialize({ endpoint: "https://cms.example.test" });
  const result = await adapter.registerWebhook({ webhookUrl: "http://site.local/webhook/id" });
  assert.equal(result.ok, false);
  assert.match(result.diagnostics.errors[0].message, /targetUrl must be a valid HTTP\(S\) URL/);
  assert.match(result.diagnostics.errors[0].message, /wpsc_webhook_target_invalid/);
});

test("WordPress Source Adapter preserves a bridge callback failure", async () => {
  const adapter = createWordPressSourceAdapter({
    auth: { password: "app-password", type: "applicationPassword", username: "editor" },
    fetchImpl: async () => response({ error: "cURL error 6: Could not resolve host: tinsinhphat.local" }, 500),
    webhookSecret: "runtime-secret"
  });
  await adapter.initialize({ endpoint: "https://cms.example.test" });
  const result = await adapter.verifyWebhook();
  assert.equal(result.ok, false);
  assert.match(result.diagnostics.errors[0].message, /Could not resolve host/);
});

test("WordPress Source Adapter uses saved application credentials while reading build content", async () => {
  const requests = [];
  const adapter = createWordPressSourceAdapter({
    contentTypes: ["posts"],
    credentials: { applicationPassword: "app-password", wordpressUsername: "editor" },
    fetchImpl: async (_url, init = {}) => {
      requests.push(init);
      return {
        headers: new Headers({ "x-wp-totalpages": "1" }),
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => "[]"
      };
    }
  });
  await adapter.initialize({ endpoint: "https://cms.example.test" });
  await adapter.getContents();
  assert.ok(requests.length > 0);
  assert.equal(requests[0].headers.authorization, `Basic ${Buffer.from("editor:app-password").toString("base64")}`);
});

test("WordPress Source Adapter exposes WooCommerce when saved consumer credentials are complete", async () => {
  const adapter = createWordPressSourceAdapter({
    credentials: {
      applicationPassword: "app-password",
      woocommerceConsumerKey: "ck_test",
      woocommerceConsumerSecret: "cs_test",
      wordpressUsername: "editor"
    },
    fetchImpl: async () => response({ ok: true })
  });
  assert.deepEqual((await adapter.getMetadata()).capabilities, ["supportsWebhook", "supportsWooCommerce"]);
});

test("WordPress Source Adapter exposes the versioned provider content contract", async () => {
  const adapter = createWordPressSourceAdapter({
    fetchImpl: async (url) => {
      const requestUrl = String(url);
      if (requestUrl.includes("/categories")) return collectionResponse([{ id: 7, name: "News", slug: "news" }]);
      if (requestUrl.includes("/users")) return collectionResponse([{ id: 4, name: "Editor", slug: "editor" }]);
      return collectionResponse([{ content: { rendered: "" }, excerpt: { rendered: "" }, id: 1, slug: "welcome", title: { rendered: "Welcome" } }]);
    }
  });
  await adapter.initialize({ endpoint: "https://cms.example.test" });
  const contract = await adapter.getContentContract();

  assert.equal(contract.schema, "wpsc.wordpress-content");
  assert.equal(contract.schemaVersion, 1);
  assert.deepEqual(contract.contents.map((content) => content.type), ["page", "post"]);
  assert.equal(contract.terms[0].taxonomy, "category");
  assert.equal(contract.authors[0].slug, "editor");
});
