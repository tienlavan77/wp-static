export default {
  name: "Basic Shop",
  homepage: "home",
  adapter: {
    type: "mock",
    source: "./content.json"
  },
  outputDir: "./dist",
  publicDir: "./public",
  builder: {
    layoutsDir: "./layouts/editor",
    editor: {
      tokenEnv: "WPSC_BUILDER_TOKEN"
    }
  },
  site: {
    url: "http://tinsinhphat.local",
    title: "Basic Shop",
    description: "Cửa hàng tĩnh tạo bởi WPSC"
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
      description: "Theme ví dụ cho WPSC"
    }
  }
};
