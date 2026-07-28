import { readFile } from "node:fs/promises";
import path from "node:path";
import createBuildEngine from "../build/createBuildEngine.js";
import createBuildIntegration from "../build/createBuildIntegration.js";
import createContentPipeline from "../content/createContentPipeline.js";
import createOutputPipeline from "../output/createOutputPipeline.js";
import createSiteRepository from "../site/createSiteRepository.js";
import createFirstBuildReadinessService from "../setup/createFirstBuildReadinessService.js";
import createSetupService from "../setup/createSetupService.js";
import createSourceRegistrationService from "../setup/createSourceRegistrationService.js";
import createWebhookActivationService from "../setup/createWebhookActivationService.js";
import createJobDispatcher from "../scheduler/createJobDispatcher.js";
import createJobQueue from "../scheduler/createJobQueue.js";
import createScheduler from "../scheduler/createScheduler.js";
import createDashboardController from "./createDashboardController.js";
import createDashboardSourceController from "./createDashboardSourceController.js";
import createFirstBuildController from "./createFirstBuildController.js";
import createRuntimeComposition from "./createRuntimeComposition.js";
import createRuntimeRouter from "./createRuntimeRouter.js";
import createWebhookRegistrationController from "./createWebhookRegistrationController.js";

export const SITE_RUNTIME_INSTANCE_VERSION = "1.0";

function createBuildStatusProvider(repository) {
  return {
    async get(siteId) {
      try { return JSON.parse(await readFile(path.join(repository.resolveSiteRoot(siteId), "config", "build.json"), "utf8")); } catch { return null; }
    }
  };
}

export default function createSiteRuntimeInstance(options = {}) {
  if (!options.adapterLoader || !options.contentReader || !options.themeRenderer || !options.webhookBaseUrl) {
    throw new TypeError("Site Runtime Instance requires adapterLoader, contentReader, themeRenderer, and webhookBaseUrl.");
  }
  const repository = options.repository || createSiteRepository(options);
  const sourceRegistrationService = createSourceRegistrationService({ adapterLoader: options.adapterLoader, repository });
  const webhookActivationService = createWebhookActivationService({ adapterLoader: options.adapterLoader, repository });
  const readinessService = createFirstBuildReadinessService({ repository });
  const setupService = options.setupService || createSetupService({
    firstBuildReadinessService: readinessService,
    sourceRegistrationService,
    webhookActivationService
  });
  const base = createRuntimeComposition({ ...options, buildStatusProvider: createBuildStatusProvider(repository), repository, setupService });
  const contentPipeline = options.contentPipeline || createContentPipeline();
  const outputPipeline = options.outputPipeline || createOutputPipeline({ repository });
  const buildEngine = options.buildEngine || createBuildEngine(options.buildEngineOptions);
  const buildIntegration = options.buildIntegration || createBuildIntegration({ buildEngine, contentPipeline, contentReader: options.contentReader, outputPipeline, themeRenderer: options.themeRenderer });
  const queue = options.queue || createJobQueue(options.queueOptions);
  const dispatcher = options.dispatcher || createJobDispatcher({ buildEngine: buildIntegration, queue });
  const scheduler = options.scheduler || createScheduler({ dispatcher, queue, retryPolicy: options.retryPolicy });
  const dashboardSource = createDashboardSourceController({ sourceRegistrationService });
  const webhookRegistration = createWebhookRegistrationController({ repository, webhookActivationService, webhookBaseUrl: options.webhookBaseUrl });
  const firstBuild = createFirstBuildController({ repository, scheduler, stateManager: base.get("stateManager") });
  const dashboard = createDashboardController({ buildStatusProvider: createBuildStatusProvider(repository), repository });
  const services = Object.freeze({
    ...base.services,
    buildEngine,
    buildIntegration,
    contentPipeline,
    dashboard,
    dashboardSource,
    dispatcher,
    firstBuild,
    outputPipeline,
    queue,
    readinessService,
    scheduler,
    sourceRegistrationService,
    webhookActivationService,
    webhookRegistration
  });
  const composition = Object.freeze({ get: (name) => { if (!Object.hasOwn(services, name)) throw new Error(`Runtime service not found: ${name}`); return services[name]; }, services, version: SITE_RUNTIME_INSTANCE_VERSION });
  const router = createRuntimeRouter({ composition });
  return Object.freeze({ composition, router, services, version: SITE_RUNTIME_INSTANCE_VERSION });
}
