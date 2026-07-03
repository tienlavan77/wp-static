export { default as buildSite } from "./builder/buildSite.js";
export { default as cleanOutput } from "./builder/cleanOutput.js";
export { default as compile } from "./core/compile.js";
export { default as createBuildManifest } from "./builder/createBuildManifest.js";
export { default as createContent } from "./core/createContent.js";
export { default as createContentCollection } from "./content/createContentCollection.js";
export { default as createContentGraph } from "./content/createContentGraph.js";
export { default as createLogger } from "./shared/createLogger.js";
export { default as createMedia } from "./content/createMedia.js";
export { default as createMenu } from "./content/createMenu.js";
export { default as createMockAdapter } from "./adapters/mockAdapter.js";
export { default as createTerm } from "./content/createTerm.js";
export { default as createWooCommerceAdapter } from "./adapters/woocommerce/woocommerceAdapter.js";
export { default as createWooCommerceClient } from "./adapters/woocommerce/woocommerceClient.js";
export { default as createRoutes } from "./router/createRoutes.js";
export { default as deepFreeze } from "./shared/deepFreeze.js";
export { default as escapeHtml } from "./shared/escapeHtml.js";
export { default as html } from "./renderer/html.js";
export { default as doctorProject } from "./core/doctorProject.js";
export { default as loadConfig } from "./core/loadConfig.js";
export { default as normalizeConfigPaths } from "./core/normalizeConfigPaths.js";
export { default as renderPage } from "./renderer/renderPage.js";
export { default as renderSeoTags } from "./seo/renderSeoTags.js";
export { default as createSeoMetadata } from "./seo/createSeoMetadata.js";
export { default as collectAssetUrls } from "./assets/collectAssetUrls.js";
export { default as processAssetPipeline } from "./assets/processAssetPipeline.js";
export { default as generateRobotsTxt } from "./seo/generateRobotsTxt.js";
export { default as generateSitemap } from "./seo/generateSitemap.js";
export { default as resolveTheme } from "./theme/resolveTheme.js";
export { default as serveStatic } from "./dev-server/serveStatic.js";
export { default as validateConfig } from "./core/validateConfig.js";
export {
  AdapterError,
  BuildError,
  ConfigError,
  RouteError,
  WpscError
} from "./shared/errors.js";

export const version = "0.0.0";

export function getPackageInfo() {
  return {
    name: "wpsc",
    version,
    status: "draft"
  };
}
