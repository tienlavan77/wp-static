export default {
  name: "Basic Shop",
  homepage: "home",
  adapter: {
    type: "mock",
    source: "./content.json"
  },
  outputDir: "./dist",
  theme: {
    layout: "./theme/layout.js"
  }
};
