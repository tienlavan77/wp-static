export default {
  name: "Basic Shop",
  homepage: "home",
  adapter: {
    type: "mock",
    source: "./content.json"
  },
  outputDir: "./dist",
  publicDir: "./public",
  site: {
    url: "http://tinsinhphat.local",
    title: "Basic Shop",
    description: "Cửa hàng tĩnh tạo bởi WPSC"
  },
  theme: {
    layout: "./theme/layout.js"
  }
};
