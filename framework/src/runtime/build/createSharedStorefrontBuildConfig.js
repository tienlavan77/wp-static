import { fileURLToPath } from "node:url";
import path from "node:path";

const themeRoot = path.resolve(fileURLToPath(new URL("../../../../themes/storefront/", import.meta.url)));

export default function createSharedStorefrontBuildConfig(options = {}) {
  const outputDir = options.outputDir || path.resolve(options.projectDir || process.cwd(), "dist");
  return {
    _paths: {
      projectDir: themeRoot,
      outputDir,
      publicDir: path.join(themeRoot, "public"),
      themeAssets: path.join(themeRoot, "assets"),
      themeBlocks: path.join(themeRoot, "blocks.js"),
      themeComponents: path.join(themeRoot, "components", "index.js"),
      themeLayout: path.join(themeRoot, "layout.js"),
      themeLayouts: {
        "archive:product_cat": path.join(themeRoot, "layouts", "archive.js"),
        account: path.join(themeRoot, "layouts", "account.js"),
        page: path.join(themeRoot, "layouts", "page.js"),
        search: path.join(themeRoot, "layouts", "search.js"),
        product: path.join(themeRoot, "layouts", "product.js")
      }
    },
    archives: options.archives,
    homepage: options.homepage || "homepage",
    name: options.name || "Shared Storefront Theme",
    outputDir,
    plugins: options.plugins || [],
    publicDir: "./public",
    site: options.site || {},
    templates: options.templates || { enabled: false },
    theme: {
      assets: "./assets",
      blocks: "./blocks.js",
      components: "./components/index.js",
      layout: "./layout.js",
      layouts: {
        "archive:product_cat": "./layouts/archive.js",
        account: "./layouts/account.js",
        page: "./layouts/page.js",
        search: "./layouts/search.js",
        product: "./layouts/product.js"
      },
      meta: { description: "Shared WPSC Storefront", name: "Shared Storefront Theme", version: "1.0.0" }
    }
  };
}
