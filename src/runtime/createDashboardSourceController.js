export const DASHBOARD_SOURCE_CONTROLLER_VERSION = "1.0";

export default function createDashboardSourceController(options = {}) {
  const sourceRegistrationService = options.sourceRegistrationService;
  // A successful check authorizes one exact, in-memory save candidate only.
  const checkedCandidates = new Map();
  if (!sourceRegistrationService || typeof sourceRegistrationService.register !== "function" || typeof sourceRegistrationService.testConnection !== "function") {
    throw new TypeError("Dashboard Source Controller requires Source Registration Service.");
  }
  function candidate(input = {}) {
    return JSON.stringify({
      credentials: Object.fromEntries(Object.entries(input.credentials || {}).sort(([left], [right]) => left.localeCompare(right))),
      source: {
        endpoint: String(input.source?.endpoint || "").trim().replace(/\/+$/, ""),
        type: String(input.source?.type || "").trim().toLowerCase()
      }
    });
  }

  function connectionStatus(input, result) {
    const credentials = input.credentials || {};
    const hasWooCredentials = result.configuration?.woocommerce ?? Boolean(credentials.woocommerceConsumerKey || credentials.woocommerceConsumerSecret);
    const wooFailed = result.diagnostics?.warnings?.some((warning) => warning.code === "woocommerce.source.validation.failed");
    return {
      woocommerce: hasWooCredentials ? (wooFailed ? "failed" : "connected") : "not_configured",
      wordpress: result.ok ? "connected" : "failed"
    };
  }

  async function testConnection(siteId, input = {}) {
    const result = await sourceRegistrationService.testConnection({ ...input, siteId });
    if (result.ok) checkedCandidates.set(siteId, candidate(input));
    else checkedCandidates.delete(siteId);
    return { ...result, connection: connectionStatus(input, result) };
  }

  async function register(siteId, input = {}) {
    if (checkedCandidates.get(siteId) !== candidate(input)) {
      return {
        diagnostics: {
          errors: [{
            code: "runtime.source.save.check_required",
            message: "Check connection must pass before saving this Source.",
            severity: "error"
          }],
          warnings: []
        },
        ok: false
      };
    }
    const result = await sourceRegistrationService.register({ ...input, siteId });
    if (result.ok) checkedCandidates.delete(siteId);
    return result;
  }
  return Object.freeze({ register, testConnection, version: DASHBOARD_SOURCE_CONTROLLER_VERSION });
}
