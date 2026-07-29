import createSourceAdapterLoader from "./src/source/createSourceAdapterLoader.js";
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
      webhookSecret: options.webhookSecret,
      auth: { type: "applicationPassword", usernameEnv: "WPSC_WP_USERNAME", passwordEnv: "WPSC_WP_APP_PASSWORD" }
    }) },
    { type: "wordpress-woocommerce", create: (options) => createWordPressSourceAdapter({
      ...options,
      sourceType: "wordpress-woocommerce"
    }) }
  ] }) }),
	site: {
    		name: "Tín Sinh Phát",
    		url: "http://tinsinhphat.local"
  	},
  
  webhookBaseUrl: "http://tinsinhphat.local/webhook"
};
