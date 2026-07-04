export { default as buildSite } from "./builder/buildSite.js";
export { default as cleanOutput } from "./builder/cleanOutput.js";
export { default as compile } from "./core/compile.js";
export { resolveWooCommerceCredentials, resolveWordPressAuth } from "./auth/sourceCredentials.js";
export { default as createBuildManifest } from "./builder/createBuildManifest.js";
export { createCacheKey, default as createJsonFileCache } from "./cache/createJsonFileCache.js";
export { default as createContent } from "./core/createContent.js";
export { default as createContentCollection } from "./content/createContentCollection.js";
export { default as createContentGraph } from "./content/createContentGraph.js";
export { default as createLogger } from "./shared/createLogger.js";
export { default as createMedia } from "./content/createMedia.js";
export { default as createMenu } from "./content/createMenu.js";
export { default as createMockAdapter } from "./adapters/mockAdapter.js";
export { default as createPluginContext } from "./plugins/createPluginContext.js";
export { default as assertPreviewAccess } from "./preview/assertPreviewAccess.js";
export { default as filterPublicContents } from "./preview/filterPublicContents.js";
export { default as createTerm } from "./content/createTerm.js";
export { default as createWatchTargets } from "./dev-server/createWatchTargets.js";
export { default as createWooCommerceAdapter } from "./adapters/woocommerce/woocommerceAdapter.js";
export { default as createWooCommerceClient } from "./adapters/woocommerce/woocommerceClient.js";
export { default as createArchiveRoutes } from "./router/createArchiveRoutes.js";
export { default as createRebuildQueue } from "./webhook/createRebuildQueue.js";
export { default as createRoutes } from "./router/createRoutes.js";
export { default as createWebhookReceiver } from "./webhook/createWebhookReceiver.js";
export { default as createWebhookServer } from "./webhook/createWebhookServer.js";
export { default as deepFreeze } from "./shared/deepFreeze.js";
export { default as escapeHtml } from "./shared/escapeHtml.js";
export { default as html } from "./renderer/html.js";
export { default as doctorProject } from "./core/doctorProject.js";
export { default as loadConfig } from "./core/loadConfig.js";
export { default as loadPlugins } from "./plugins/loadPlugins.js";
export { default as normalizeConfigPaths } from "./core/normalizeConfigPaths.js";
export { default as normalizeWebhookPayload } from "./webhook/normalizeWebhookPayload.js";
export { default as parseChangedItem } from "./incremental/parseChangedItem.js";
export { default as planIncrementalBuild } from "./incremental/planIncrementalBuild.js";
export { default as renderPage } from "./renderer/renderPage.js";
export { default as renderSeoTags } from "./seo/renderSeoTags.js";
export { default as createSeoMetadata } from "./seo/createSeoMetadata.js";
export { default as collectAssetUrls } from "./assets/collectAssetUrls.js";
export { default as processAssetPipeline } from "./assets/processAssetPipeline.js";
export { default as generateRobotsTxt } from "./seo/generateRobotsTxt.js";
export { default as generateSitemap } from "./seo/generateSitemap.js";
export { default as createContentValidationReport } from "./report/createContentValidationReport.js";
export { default as createInputHash } from "./incremental/createInputHash.js";
export { default as createRouteRenderCache } from "./cache/createRouteRenderCache.js";
export { default as createRouteDependencyGraph } from "./incremental/createRouteDependencyGraph.js";
export { default as resolveTheme } from "./theme/resolveTheme.js";
export { default as mapWebhookChanges } from "./webhook/mapWebhookChanges.js";
export { default as readThroughCache } from "./cache/readThroughCache.js";
export { default as runLimitedParallel } from "./performance/runLimitedParallel.js";
export { runPluginEvent, runPluginHook } from "./plugins/runPluginHook.js";
export {
  assertNoFrontendSecrets,
  CUSTOMER_AUTH_BOUNDARY,
  CUSTOMER_AUTH_MODES,
  FORBIDDEN_FRONTEND_SECRETS,
  validateCustomerAuthMode
} from "./runtime/customerAuthStrategy.js";
export { default as createCommerceRuntime } from "./runtime/commerce/createCommerceRuntime.js";
export { default as createCommerceServer } from "./runtime/commerce/createCommerceServer.js";
export { default as createSessionStore } from "./runtime/commerce/createSessionStore.js";
export { default as resolveCustomerSession } from "./runtime/commerce/sessionMiddleware.js";
export { default as renderAccountDashboard } from "./runtime/account/renderAccountDashboard.js";
export { default as renderAccountShell } from "./runtime/account/renderAccountShell.js";
export { default as renderAddressBookView } from "./runtime/account/renderAddressBookView.js";
export { default as renderLoginView } from "./runtime/account/renderLoginView.js";
export { default as renderLogoutView } from "./runtime/account/renderLogoutView.js";
export { default as renderOrderHistoryView } from "./runtime/account/renderOrderHistoryView.js";
export { default as serveStatic } from "./dev-server/serveStatic.js";
export { default as startDevServer } from "./dev-server/startDevServer.js";
export { default as validateConfig } from "./core/validateConfig.js";
export {
  AdapterError,
  BuildError,
  ConfigError,
  RouteError,
  WpscError
} from "./shared/errors.js";

export const version = "0.1.0";

export function getPackageInfo() {
  return {
    name: "wpsc",
    version,
    status: "draft"
  };
}
