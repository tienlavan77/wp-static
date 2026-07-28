export const DASHBOARD_SOURCE_CONTROLLER_VERSION = "1.0";

export default function createDashboardSourceController(options = {}) {
  const sourceRegistrationService = options.sourceRegistrationService;
  if (!sourceRegistrationService || typeof sourceRegistrationService.register !== "function" || typeof sourceRegistrationService.testConnection !== "function") {
    throw new TypeError("Dashboard Source Controller requires Source Registration Service.");
  }
  function testConnection(siteId, input = {}) {
    return sourceRegistrationService.testConnection({ ...input, siteId });
  }
  function register(siteId, input = {}) {
    return sourceRegistrationService.register({ ...input, siteId });
  }
  return Object.freeze({ register, testConnection, version: DASHBOARD_SOURCE_CONTROLLER_VERSION });
}
