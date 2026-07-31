export default {
  name: "Basic Shop",
  homepage: "home",
  adapter: {
    type: "mock",
    source: "./content.json"
  },
  outputDir: "./dist",
  plugins: [
    "./plugins/ui-demo-route.js"
  ],
  publicDir: "./public",
  builder: {
    layoutsDir: "./layouts/editor",
    editor: {
      tokenEnv: "WPSC_BUILDER_TOKEN"
    }
  },
  site: {
    url: "http://example.test",
    title: "Basic Shop",
    description: "Deterministic WPSC test fixture"
  },
  templates: {
    enabled: true
  },
  theme: {
    layout: "./theme/layout.js",
    blocks: "./theme/blocks.js",
    layouts: {
      page: "./theme/layouts/page.js",
      product: "./theme/layouts/product.js"
    },
    components: "./theme/components/index.js",
    assets: "./theme/assets",
    meta: {
      name: "Basic Commerce Theme",
      version: "0.1.0",
      description: "Deterministic test fixture theme"
    }
  }
};
