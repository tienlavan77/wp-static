import createDashboardController from "./createDashboardController.js";
import createInstallerController from "./createInstallerController.js";
import createSiteRuntime, { createInstallationCheck, createSiteResolver } from "./createSiteRuntime.js";
import createSetupService from "../setup/createSetupService.js";
import createSiteRepository from "../site/createSiteRepository.js";
import createSiteStateManager from "../site/createSiteStateManager.js";

export const RUNTIME_COMPOSITION_VERSION = "1.0";

export default function createRuntimeComposition(options = {}) {
  const repository = options.repository || createSiteRepository(options);
  const setupService = options.setupService || createSetupService(options.setupOptions);
  const stateManager = options.stateManager || createSiteStateManager();
  const installationCheck = options.installationCheck || createInstallationCheck(repository);
  const siteResolver = options.siteResolver || createSiteResolver({ domains: options.domains });
  const runtime = createSiteRuntime({ installationCheck, siteResolver });
  const installer = options.installer || createInstallerController({ repository, setupService, stateManager });
  const dashboard = options.dashboard || createDashboardController({ buildStatusProvider: options.buildStatusProvider, repository });
  const services = Object.freeze({ dashboard, installationCheck, installer, repository, runtime, setupService, siteResolver, stateManager });

  return Object.freeze({
    get(name) {
      if (!Object.hasOwn(services, name)) throw new Error(`Runtime service not found: ${name}`);
      return services[name];
    },
    services,
    version: RUNTIME_COMPOSITION_VERSION
  });
}
