export default {
  name: "Tin Sinh Phat",
  homepage: "homepage",
  adapter: {
    type: "wordpressWooCommerce",
    wordpress: {
      baseUrl: "https://api.tinsinhphat.com",
      contentTypes: ["pages", "posts"],
      customPostTypes: [],
      taxonomies: ["categories", "tags"],
      includeMedia: true,
      includeMenus: true,
      includeAcf: true,
      seo: {
        provider: "rankmath"
      },
      auth: {
        type: "applicationPassword",
        usernameEnv: "WPSC_WP_USERNAME",
        passwordEnv: "WPSC_WP_APP_PASSWORD"
      }
    },
    woocommerce: {
      baseUrl: "https://api.tinsinhphat.com",
      consumerKeyEnv: "WPSC_WOO_CONSUMER_KEY",
      consumerSecretEnv: "WPSC_WOO_CONSUMER_SECRET",
      includeCategories: true,
      includeTags: true,
      includeVariations: true,
      seo: {
        provider: "rankmath"
      }
    }
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
    title: "Tin Sinh Phat",
    description: "Website tĩnh tạo bởi WPSC từ WordPress và WooCommerce"
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
      version: "1.0.0",
      description: "Theme ví dụ cho WPSC"
    }
  }
};
