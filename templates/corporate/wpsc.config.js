export default {
  name: "WPSC Corporate",
  homepage: "home",
  adapter: {
    type: "mock",
    source: "./content.json"
  },
  outputDir: "./dist",
  publicDir: "./public",
  theme: {
    layout: "./theme/layout.js"
  }
};
