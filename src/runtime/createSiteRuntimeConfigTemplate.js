export const SITE_RUNTIME_CONFIG_TEMPLATE_VERSION = "1.0";

// A runnable local adapter makes the first Runtime boot deterministic; projects replace it with a real provider.
export default function createSiteRuntimeConfigTemplate(options = {}) {
  const webhookBaseUrl = String(options.webhookBaseUrl || "http://example.test/webhook");
  return `import createSourceAdapterLoader from "./src/source/createSourceAdapterLoader.js";
import createSourceRegistry from "./src/source/createSourceRegistry.js";
import createWordPressSourceAdapter from "./src/source/createWordPressSourceAdapter.js";

const demoAdapter = {
  async initialize() { return { ok: true }; },
  async validate() { return { ok: true }; },
  async healthCheck() { return { ok: true }; },
  async getMetadata() {
    return { adapterVersion: "1.0", capabilities: ["supportsWebhook"], sourceType: "demo" };
  },
  async registerWebhook() { return { ok: true, webhookId: "demo-webhook-1" }; },
  async verifyWebhook() { return { ok: true }; },
  async unregisterWebhook() { return { ok: true }; }
};

export default {
  adapterLoader: createSourceAdapterLoader({ registry: createSourceRegistry({ adapters: [
    { type: "demo", create: () => demoAdapter },
    { type: "wordpress", create: (options) => createWordPressSourceAdapter({
      ...options,
      webhookSecret: options.webhookSecret
    }) },
    { type: "wordpress-woocommerce", create: (options) => createWordPressSourceAdapter({
      ...options,
      sourceType: "wordpress-woocommerce"
    }) }
  ] }) }),
  webhookBaseUrl: ${JSON.stringify(webhookBaseUrl)}
};
`;
}
