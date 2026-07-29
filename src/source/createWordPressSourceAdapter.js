import createWordPressAdapter from "../adapters/wordpress/wordpressAdapter.js";
import createWordPressWooCommerceAdapter from "../adapters/wordpressWooCommerce/wordpressWooCommerceAdapter.js";
import { resolveWordPressAuth } from "../auth/sourceCredentials.js";

export const WORDPRESS_SOURCE_ADAPTER_VERSION = "1.0";

function diagnostics(code, message) { return { diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false }; }
function normalizeEndpoint(value) { return String(value || "").trim().replace(/\/+$/, ""); }

export default function createWordPressSourceAdapter(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const credentials = options.credentials || {};
  const sourceType = options.sourceType || "wordpress";
  // WooCommerce is an optional capability of a WordPress source, not a separate setup flow.
  let woocommerceEnabled = Boolean(credentials.woocommerceConsumerKey && credentials.woocommerceConsumerSecret);
  const contentAuth = credentials.wordpressUsername && credentials.applicationPassword
    ? { password: credentials.applicationPassword, type: "applicationPassword", username: credentials.wordpressUsername }
    : options.auth;
  const auth = resolveWordPressAuth({ ...options, auth: contentAuth }, options.env || process.env);
  const webhook = { configPath: "/wp-json/wpsc/v1/webhook/config", statusPath: "/wp-json/wpsc/v1/webhook/status", testPath: "/wp-json/wpsc/v1/webhook/test", ...(options.webhook || {}) };
  let endpoint = normalizeEndpoint(options.endpoint);
  if (typeof fetchImpl !== "function") throw new TypeError("WordPress Source Adapter requires fetch.");

  function headers() { return { "content-type": "application/json", ...(auth?.headers || {}) }; }
  async function request(path, init = {}) {
    if (!endpoint) throw new Error("WordPress endpoint is not initialized.");
    const response = await fetchImpl(`${endpoint}${path}`, { ...init, headers: { ...headers(), ...(init.headers || {}) } });
    const text = await response.text();
    let body = {};
    try { body = text ? JSON.parse(text) : {}; } catch { body = {}; }
    if (!response.ok) {
      const reason = [body.message, body.error]
        .find((value) => typeof value === "string" && value.trim())?.trim() || response.statusText;
      const code = typeof body.code === "string" ? ` (${body.code})` : "";
      throw new Error(`WordPress request failed: ${response.status} ${reason}${code}`);
    }
    return body;
  }

  function createContentAdapter() {
    if (!woocommerceEnabled) return createWordPressAdapter({ ...options, auth: contentAuth, baseUrl: endpoint });
    return createWordPressWooCommerceAdapter({
      shared: { baseUrl: endpoint },
      woocommerce: {
        baseUrl: endpoint,
        consumerKey: credentials.woocommerceConsumerKey,
        consumerSecret: credentials.woocommerceConsumerSecret,
        // Builder V1 needs full variation records, not only WooCommerce variation IDs.
        includeVariations: true
      },
      wordpress: {
        auth: credentials.wordpressUsername && credentials.applicationPassword
          ? { password: credentials.applicationPassword, type: "applicationPassword", username: credentials.wordpressUsername }
          : options.auth,
        baseUrl: endpoint
      }
    });
  }

  return Object.freeze({
    async getContents() {
      if (!endpoint) throw new Error("WordPress endpoint is not initialized.");
      return createContentAdapter().getContents();
    },
    async getCollections() {
      if (!endpoint) throw new Error("WordPress endpoint is not initialized.");
      const adapter = createContentAdapter();
      return typeof adapter.getCollections === "function" ? adapter.getCollections() : {};
    },
    async getMetadata() { return { adapterVersion: WORDPRESS_SOURCE_ADAPTER_VERSION, capabilities: ["supportsWebhook", ...(woocommerceEnabled ? ["supportsWooCommerce"] : [])], sourceType }; },
    async healthCheck() { try { await request("/wp-json/"); return { ok: true }; } catch (error) { return diagnostics("wordpress.source.health.failed", error.message); } },
    async initialize(input = {}) { endpoint = normalizeEndpoint(input.endpoint || endpoint); return endpoint ? { ok: true } : diagnostics("wordpress.source.endpoint.required", "WordPress endpoint is required."); },
    async registerWebhook(input = {}) {
      try {
        const configured = await request(webhook.configPath, { body: JSON.stringify({ secret: options.webhookSecret, targetUrl: input.webhookUrl }), method: "POST" });
        if (!configured.ok || typeof configured.webhookId !== "string") return diagnostics("wordpress.webhook.bridge.configuration.failed", "WordPress Webhook Bridge did not accept Runtime configuration.");
        const status = await request(webhook.statusPath);
        if (!status.enabled || !status.targetConfigured || !status.secretConfigured) return diagnostics("wordpress.webhook.bridge.unconfigured", "WPSC Webhook Bridge must be enabled with target URL and secret configured.");
        return { ok: true, webhookId: configured.webhookId };
      } catch (error) { return diagnostics("wordpress.webhook.bridge.unavailable", error.message); }
    },
    async unregisterWebhook() { try { await request(webhook.configPath, { method: "DELETE" }); return { ok: true }; } catch (error) { return diagnostics("wordpress.webhook.remove.failed", error.message); } },
    async validate() { try { await request(auth ? "/wp-json/wp/v2/users/me" : "/wp-json/"); if (woocommerceEnabled) { try { await request(`/wp-json/wc/v3/system_status?consumer_key=${encodeURIComponent(credentials.woocommerceConsumerKey)}&consumer_secret=${encodeURIComponent(credentials.woocommerceConsumerSecret)}`); } catch { woocommerceEnabled = false; return { diagnostics: { errors: [], warnings: [{ code: "woocommerce.source.validation.failed", message: "WooCommerce credentials are unavailable; continuing with WordPress content only.", severity: "warning" }] }, ok: true }; } } return { ok: true }; } catch (error) { return diagnostics("wordpress.source.validation.failed", error.message); } },
    async verifyWebhook() { try { const result = await request(webhook.testPath, { headers: options.webhookSecret ? { "x-wpsc-webhook-secret": options.webhookSecret } : {}, method: "POST" }); return result.ok ? { ok: true } : diagnostics("wordpress.webhook.verification.failed", result.error || "WordPress webhook test failed."); } catch (error) { return diagnostics("wordpress.webhook.verification.failed", error.message); } }
  });
}
