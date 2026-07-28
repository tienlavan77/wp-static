export { default as buildSite } from "./builder/buildSite.js";
export { SITE_RUNTIME_INSTANCE_VERSION, default as createSiteRuntimeInstance } from "./runtime/createSiteRuntimeInstance.js";
export { RUNTIME_HTTP_SERVER_VERSION, default as createRuntimeHttpServer } from "./runtime/createRuntimeHttpServer.js";
export { SITE_RUNTIME_CONFIG_FILE, default as loadSiteRuntimeConfig } from "./runtime/loadSiteRuntimeConfig.js";
export { RUNTIME_ROUTER_VERSION, default as createRuntimeRouter } from "./runtime/createRuntimeRouter.js";
export { RUNTIME_COMPOSITION_VERSION, default as createRuntimeComposition } from "./runtime/createRuntimeComposition.js";
export { FIRST_BUILD_CONTROLLER_VERSION, default as createFirstBuildController } from "./runtime/createFirstBuildController.js";
export {
  WEBHOOK_REGISTRATION_CONTROLLER_VERSION,
  WEBHOOK_RUNTIME_SCHEMA,
  WEBHOOK_RUNTIME_SCHEMA_VERSION,
  default as createWebhookRegistrationController
} from "./runtime/createWebhookRegistrationController.js";
export { DASHBOARD_SOURCE_CONTROLLER_VERSION, default as createDashboardSourceController } from "./runtime/createDashboardSourceController.js";
export { DASHBOARD_CONTROLLER_VERSION, default as createDashboardController } from "./runtime/createDashboardController.js";
export { INSTALLER_CONTROLLER_VERSION, default as createInstallerController } from "./runtime/createInstallerController.js";
export {
  SITE_RUNTIME_INDEX_PHP,
  SITE_RUNTIME_VERSION,
  createInstallationCheck,
  default as createSiteRuntime,
  createSiteRuntimeEntryPoint,
  createSiteResolver,
  createSiteRuntimeSkeleton
} from "./runtime/createSiteRuntime.js";
export { default as createBuildApi } from "./api/createBuildApi.js";
export { default as createSiteBuildCommand } from "./cli/createSiteBuildCommand.js";
export { SITE_CREATE_COMMAND_VERSION, default as createSiteCreateCommand } from "./cli/createSiteCreateCommand.js";
export { RUNTIME_SERVE_COMMAND_VERSION, default as createRuntimeServeCommand } from "./cli/createRuntimeServeCommand.js";
export { default as createSchedulerWebhookReceiver } from "./webhook/createSchedulerWebhookReceiver.js";
export { SCHEDULER_VERSION, default as createScheduler } from "./scheduler/createScheduler.js";
export { JOB_DISPATCHER_VERSION, default as createJobDispatcher } from "./scheduler/createJobDispatcher.js";
export { JOB_QUEUE_VERSION, default as createJobQueue } from "./scheduler/createJobQueue.js";
export {
  JobEvent,
  JobStatus,
  JobTrigger,
  SCHEDULER_CONTRACT_VERSION,
  SchedulerEvent,
  SchedulerState,
  assertDispatcherInterface,
  assertQueueInterface,
  assertSchedulerInterface,
  createJob,
  validateJob
} from "./scheduler/schedulerContracts.js";
export { BUILD_INTEGRATION_VERSION, default as createBuildIntegration } from "./build/createBuildIntegration.js";
export { OUTPUT_PIPELINE_VERSION, default as createOutputPipeline } from "./output/createOutputPipeline.js";
export {
  BUILD_ENGINE_VERSION,
  BuildClient,
  BuildEvent,
  BuildState,
  createBuildContext,
  createBuildResult,
  default as createBuildEngine,
  validateBuildContext
} from "./build/createBuildEngine.js";
export {
  WebhookActivationEvent,
  default as createWebhookActivationService
} from "./setup/createWebhookActivationService.js";
export { FirstBuildReadinessEvent, default as createFirstBuildReadinessService } from "./setup/createFirstBuildReadinessService.js";
export {
  SOURCE_METADATA_SCHEMA,
  SOURCE_METADATA_SCHEMA_VERSION,
  SourceRegistrationEvent,
  default as createSourceRegistrationService
} from "./setup/createSourceRegistrationService.js";
export { default as createSourceAdapterLoader } from "./source/createSourceAdapterLoader.js";
export { default as createSourceRegistry } from "./source/createSourceRegistry.js";
export {
  assertSourceAdapter,
  SOURCE_ADAPTER_CONTRACT_VERSION,
  SOURCE_ADAPTER_REQUIRED_METHODS,
  SourceAdapterMethod,
  validateSourceAdapter
} from "./source/sourceAdapterContract.js";
export {
  SITE_SETUP_COMMAND_VERSION,
  default as createSiteSetupCommand
} from "./cli/createSiteSetupCommand.js";
export {
  BROWSER_SETUP_WIZARD_VERSION,
  default as createSetupWizard
} from "./browser/createSetupWizard.js";
export { default as addRelatedProducts } from "./commerce/addRelatedProducts.js";
export { default as applyAdvancedCommerceData } from "./commerce/applyAdvancedCommerceData.js";
export { default as cleanOutput } from "./builder/cleanOutput.js";
export { default as createRsyncDeployPlan } from "./deploy/createRsyncDeployPlan.js";
export { default as createCommerceCollections } from "./commerce/createCommerceCollections.js";
export { default as createProductVariantContents } from "./commerce/createProductVariantContents.js";
export { default as compile } from "./core/compile.js";
export { default as coreCommerceBlocks } from "./blocks/core/commerceBlocks.js";
export { resolveWooCommerceCredentials, resolveWordPressAuth } from "./auth/sourceCredentials.js";
export { default as createBuildManifest } from "./builder/createBuildManifest.js";
export { default as createBlockRegistry } from "./blocks/createBlockRegistry.js";
export { default as createBlockSchema } from "./blocks/createBlockSchema.js";
export { createCacheKey, default as createJsonFileCache } from "./cache/createJsonFileCache.js";
export { default as createFreshBuildOptions } from "./invalidate/createFreshBuildOptions.js";
export { default as createContentTypeLayoutIndex } from "./visual-builder/createContentTypeLayoutIndex.js";
export { default as createContent } from "./core/createContent.js";
export { default as createContentCollection } from "./content/createContentCollection.js";
export {
  CONTENT_PIPELINE_VERSION,
  createContentModel,
  default as createContentPipeline,
  normalizeContent
} from "./content/createContentPipeline.js";
export { default as createContentGraph } from "./graph/createContentGraph.js";
export { default as createRouteDependencyGraph } from "./graph/createRouteDependencyGraph.js";
export { default as createLayoutDocument, validateLayoutDocument } from "./visual-builder/createLayoutDocument.js";
export { default as createLayoutNode } from "./visual-builder/createLayoutNode.js";
export { default as createLayoutRevisionStore } from "./visual-builder/production/createLayoutRevisionStore.js";
export { default as createBuilderWorkflow } from "./visual-builder/production/createBuilderWorkflow.js";
export { default as createBuilderPublishChange } from "./visual-builder/production/createBuilderPublishChange.js";
export { default as createLogger } from "./shared/createLogger.js";
export { default as createMedia } from "./content/createMedia.js";
export { default as createMenu } from "./content/createMenu.js";
export { default as createMockAdapter } from "./adapters/mockAdapter.js";
export { default as createPluginContext } from "./plugins/createPluginContext.js";
export { default as assertPreviewAccess } from "./preview/assertPreviewAccess.js";
export { default as assertBuilderEditorAccess } from "./visual-builder/production/assertBuilderEditorAccess.js";
export { default as filterPublicContents } from "./preview/filterPublicContents.js";
export { default as createTerm } from "./content/createTerm.js";
export { default as createWatchTargets } from "./watcher/createWatchTargets.js";
export { default as createWordPressAdapter } from "./adapters/wordpress/wordpressAdapter.js";
export { default as createWordPressWooCommerceAdapter } from "./adapters/wordpressWooCommerce/wordpressWooCommerceAdapter.js";
export { default as createWooCommerceAdapter } from "./adapters/woocommerce/woocommerceAdapter.js";
export { default as createWooCommerceClient } from "./adapters/woocommerce/woocommerceClient.js";
export { default as createArchiveRoutes } from "./router/createArchiveRoutes.js";
export { default as createRebuildQueue } from "./queue/createRebuildQueue.js";
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
export { RESPONSIVE_BREAKPOINTS, default as normalizeResponsiveSettings } from "./visual-builder/normalizeResponsiveSettings.js";
export { default as parseChangedItem } from "./planner/parseChangedItem.js";
export { default as planIncrementalBuild } from "./planner/planIncrementalBuild.js";
export { default as createProgressReporter } from "./progress/createProgressReporter.js";
export { default as renderPage } from "./renderer/renderPage.js";
export { THEME_RENDERER_VERSION, default as createThemeRenderer } from "./renderer/createThemeRenderer.js";
export { default as renderSeoTags } from "./seo/renderSeoTags.js";
export { default as createSeoMetadata } from "./seo/createSeoMetadata.js";
export {
  SITE_METADATA_REQUIRED_FIELDS,
  SITE_METADATA_VERSION,
  SITE_STATUSES,
  SiteState,
  default as createSiteMetadata,
  validateSiteMetadata
} from "./site/createSiteMetadata.js";
export {
  SITE_STATE_TRANSITIONS,
  default as createSiteStateManager
} from "./site/createSiteStateManager.js";
export { default as createSiteRepository } from "./site/createSiteRepository.js";
export { default as createSitePathPolicy } from "./site/createSitePathPolicy.js";
export {
  SITE_UUID_VERSION,
  default as createSiteUuid,
  isSiteUuid
} from "./site/createSiteUuid.js";
export { default as createSiteLoader } from "./site/createSiteLoader.js";
export {
  createSiteRelativePath,
  default as createSiteRegistry
} from "./site/createSiteRegistry.js";
export {
  ProvisioningEvent,
  ProvisioningStep,
  PROVISIONING_SERVICE_VERSION,
  SITE_PROVISIONING_DIRECTORIES,
  default as createProvisioningService,
  planCreateSite
} from "./provision/createProvisioningService.js";
export {
  PROVISIONING_SECRET_ALGORITHM,
  PROVISIONING_SECRET_BYTES,
  PROVISIONING_SECRET_METADATA_VERSION,
  PROVISIONING_SECRET_VERSION,
  ProvisioningSecretType,
  createRandomSecretProvider,
  createSecret,
  default as createProvisioningSecrets,
  unwrapProvisioningSecrets,
  validateProvisioningSecrets
} from "./provision/createProvisioningSecrets.js";
export {
  PROVISIONING_CONFIG_SCHEMA,
  PROVISIONING_CONFIG_SCHEMA_VERSION,
  default as createProvisioningConfig,
  validateProvisioningConfig
} from "./provision/createProvisioningConfig.js";
export {
  PROVISIONING_ENVIRONMENT_VERSION,
  ProvisioningEnvironmentSeverity,
  default as validateProvisioningEnvironment
} from "./provision/validateProvisioningEnvironment.js";
export {
  SETUP_SERVICE_VERSION,
  SetupClient,
  SetupEvent,
  default as createSetupService,
  validateSetupContext
} from "./setup/createSetupService.js";

export { default as collectAssetUrls } from "./assets/collectAssetUrls.js";
export { default as processAssetPipeline } from "./assets/processAssetPipeline.js";
export { default as generateRobotsTxt } from "./seo/generateRobotsTxt.js";
export { default as generateSitemap } from "./seo/generateSitemap.js";
export { default as createContentValidationReport } from "./report/createContentValidationReport.js";
export { default as createInputHash } from "./incremental/createInputHash.js";
export { default as createRouteRenderCache } from "./cache/createRouteRenderCache.js";
export { default as resolveTheme } from "./theme/resolveTheme.js";
export { default as loadTemplateDocument } from "./templates/loadTemplateDocument.js";
export { createTemplateScope, default as createTemplateManifest } from "./templates/createTemplateManifest.js";
export { default as resolveTemplateForRoute, createTemplateCandidates } from "./templates/resolveTemplateForRoute.js";
export { default as writeTemplateManifest } from "./templates/writeTemplateManifest.js";
export { default as mapWebhookChanges } from "./webhook/mapWebhookChanges.js";
export { default as readThroughCache } from "./cache/readThroughCache.js";
export { default as renderBlock } from "./blocks/renderBlock.js";
export { default as resolveBlockBindings } from "./blocks/resolveBlockBindings.js";
export { default as runLimitedParallel } from "./performance/runLimitedParallel.js";
export { default as runRsyncDeploy } from "./deploy/runRsyncDeploy.js";
export { default as validateBlockProps } from "./blocks/validateBlockProps.js";
export { runPluginEvent, runPluginHook } from "./plugins/runPluginHook.js";
export {
  V1_ADAPTER_API,
  V1_ADAPTER_OPTIONAL_METHODS,
  V1_ADAPTER_REQUIRED_METHODS
} from "./api/v1AdapterApi.js";
export { V1_PLUGIN_API, V1_PLUGIN_HOOKS } from "./api/v1PluginApi.js";
export {
  SETUP_API_VERSION,
  SetupApiRoute,
  default as createSetupApi
} from "./api/createSetupApi.js";
export {
  V1_THEME_API,
  V1_THEME_CONFIG_FIELDS,
  V1_THEME_LAYOUT_CONTEXT_FIELDS
} from "./api/v1ThemeApi.js";
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
export { default as createWooCommerceAccountService } from "./runtime/commerce/createWooCommerceAccountService.js";
export { default as createWordPressAuthService } from "./runtime/commerce/createWordPressAuthService.js";
export { default as resolveCustomerSession } from "./runtime/commerce/sessionMiddleware.js";
export { default as renderAccountDashboard } from "./runtime/account/renderAccountDashboard.js";
export { default as renderAccountShell } from "./runtime/account/renderAccountShell.js";
export { default as renderAddressBookView } from "./runtime/account/renderAddressBookView.js";
export { default as renderLoginView } from "./runtime/account/renderLoginView.js";
export { default as renderLayout } from "./visual-builder/renderLayout.js";
export { default as renderLayoutNode } from "./visual-builder/renderLayoutNode.js";
export { default as renderThemePreview } from "./visual-builder/renderThemePreview.js";
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

export const version = "1.0.0";

export function getPackageInfo() {
  return {
    name: "wpsc",
    version,
    status: "stable"
  };
}
