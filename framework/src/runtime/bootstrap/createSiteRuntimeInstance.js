import { readFile } from "node:fs/promises";
import path from "node:path";
import createBuildEngine from "../../build/createBuildEngine.js";
import createBuildIntegration from "../../build/createBuildIntegration.js";
import createOutputPipeline from "../../output/createOutputPipeline.js";
import createSiteRepository from "../../site/createSiteRepository.js";
import createSiteConfigurationService from "../../site/createSiteConfigurationService.js";
import createFirstBuildReadinessService from "../../setup/createFirstBuildReadinessService.js";
import createSetupService from "../../setup/createSetupService.js";
import createSourceRegistrationService from "../../setup/createSourceRegistrationService.js";
import createWebhookActivationService from "../../setup/createWebhookActivationService.js";
import createJobDispatcher from "../../scheduler/dispatcher/createJobDispatcher.js";
import createJobQueue from "../../scheduler/queue/createJobQueue.js";
import createScheduler from "../../scheduler/policy/createScheduler.js";
import createDashboardController from "../dashboard/createDashboardController.js";
import createDashboardSourceController from "../dashboard/createDashboardSourceController.js";
import createFirstBuildController from "../dashboard/createFirstBuildController.js";
import createRuntimeComposition from "./createRuntimeComposition.js";
import createRuntimeRouter from "../router/createRuntimeRouter.js";
import createWebhookRegistrationController from "../webhook/createWebhookRegistrationController.js";
import createRuntimeBrowserViews from "../browser/createRuntimeBrowserViews.js";
import createRuntimeContentReader from "../source/createRuntimeContentReader.js";
import createRuntimeWebhookReceiver from "../webhook/createRuntimeWebhookReceiver.js";
import createSourceCredentialStore from "../source/createSourceCredentialStore.js";
import createRuntimeV1Builder from "../build/createRuntimeV1Builder.js";
import createSiteCommerceGateway from "../commerce/createSiteCommerceGateway.js";
import createSiteContext from "../../site/createSiteContext.js";

export const SITE_RUNTIME_INSTANCE_VERSION = "1.0";

function createBuildStatusProvider(repository) {
  return {
    async get(siteId) {
      try { return JSON.parse(await readFile(path.join(repository.resolveSiteRoot(siteId), "config", "build.json"), "utf8")); } catch { return null; }
    }
  };
}

function createWebhookBaseUrlResolver(options = {}) {
  const fallback = String(options.webhookBaseUrl || "").replace(/\/$/, "");
  return (siteId) => {
    const domain = Object.entries(options.domains || {}).find(([, mappedSiteId]) => mappedSiteId === siteId)?.[0];
    if (!domain) return fallback;
    try {
      const url = new URL(fallback);
      url.host = domain;
      return url.toString().replace(/\/$/, "");
    } catch { return fallback; }
  };
}

export default function createSiteRuntimeInstance(options = {}) {
  if (!options.adapterLoader || !options.webhookBaseUrl) {
    throw new TypeError("Site Runtime Instance requires adapterLoader and webhookBaseUrl.");
  }
  const repository = options.repository || createSiteRepository(options);
  const siteConfiguration = options.siteConfiguration || createSiteConfigurationService({ repository });
  const credentialStore = createSourceCredentialStore({ repository });
  const contentReader = options.contentReader || createRuntimeContentReader({ adapterLoader: options.adapterLoader, credentialStore, repository });
  const sourceRegistrationService = createSourceRegistrationService({ adapterLoader: options.adapterLoader, credentialStore, repository });
  const webhookActivationService = createWebhookActivationService({ adapterLoader: options.adapterLoader, credentialStore, repository });
  const readinessService = createFirstBuildReadinessService({ repository });
  const setupService = options.setupService || createSetupService({
    firstBuildReadinessService: readinessService,
    sourceRegistrationService,
    webhookActivationService
  });
  const base = createRuntimeComposition({ ...options, buildStatusProvider: createBuildStatusProvider(repository), repository, setupService });
  const outputPipeline = options.outputPipeline || createOutputPipeline({ repository });
  const runtimeV1Builder = options.runtimeV1Builder || createRuntimeV1Builder({ repository });
  const buildEngine = options.buildEngine || createBuildEngine(options.buildEngineOptions);
  const buildIntegration = options.buildIntegration || createBuildIntegration({ buildEngine, contentReader, outputPipeline, runtimeV1Builder, site: options.site });
  const queue = options.queue || createJobQueue(options.queueOptions);
  const dispatcher = options.dispatcher || createJobDispatcher({ buildEngine: buildIntegration, queue });
  const scheduler = options.scheduler || createScheduler({ dispatcher, queue, retryPolicy: options.retryPolicy });
  // Runtime owns the Scheduler lifecycle; browser requests can only trigger an active scheduler.
  scheduler.start();
  const dashboardSource = createDashboardSourceController({ sourceRegistrationService });
  const webhookRegistration = createWebhookRegistrationController({ repository, webhookActivationService, webhookBaseUrl: options.webhookBaseUrl, resolveWebhookBaseUrl: createWebhookBaseUrlResolver(options) });
  const webhookReceiver = createRuntimeWebhookReceiver({ repository, scheduler });
  const firstBuild = createFirstBuildController({ repository, scheduler, stateManager: base.get("stateManager") });
  const dashboard = createDashboardController({ buildStatusProvider: createBuildStatusProvider(repository), credentialStore, repository });
  const commerceGateway = options.commerceGateway || createSiteCommerceGateway({ credentialStore, repository });
  const browserViews = options.browserViews || createRuntimeBrowserViews();
  const services = Object.freeze({
    ...base.services,
    buildEngine,
    browserViews,
    buildIntegration,
    commerceGateway,
    credentialStore,
    dashboard,
    dashboardSource,
    dispatcher,
    firstBuild,
    outputPipeline,
    queue,
    readinessService,
    scheduler,
    siteContext: Object.freeze({ create: createSiteContext }),
    siteConfiguration,
    sourceRegistrationService,
    webhookActivationService,
    webhookReceiver,
    webhookRegistration
  });
  const composition = Object.freeze({ get: (name) => { if (!Object.hasOwn(services, name)) throw new Error(`Runtime service not found: ${name}`); return services[name]; }, services, version: SITE_RUNTIME_INSTANCE_VERSION });
  const router = createRuntimeRouter({ composition });
  return Object.freeze({ composition, router, services, version: SITE_RUNTIME_INSTANCE_VERSION });
}
