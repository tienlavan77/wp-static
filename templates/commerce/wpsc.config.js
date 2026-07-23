export default {
  name: "WPSC Commerce",
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
