import deepFreeze from "../shared/deepFreeze.js";

export const SITE_HEALTH_SCHEMA = "wpsc.site-health";
export const SITE_HEALTH_VERSION = 1;
export const HealthState = Object.freeze({ DEGRADED: "degraded", HEALTHY: "healthy", UNKNOWN: "unknown", UNHEALTHY: "unhealthy" });

export default function createSiteHealthService(options = {}) {
  const registry = options.registry;
  if (!registry?.listSites) throw new TypeError("Site Health Service requires a Site Registry.");
  const checks = normalizeChecks(options.checks ?? {});
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();

  async function inspect(siteId) {
    const site = (await registry.listSites()).find((entry) => (entry.siteId ?? entry.id) === siteId);
    if (!site) return failure("health.site.not_found", `Site was not found: ${siteId}.`);
    const results = await Promise.all(checks.map((check) => executeCheck(check, siteId, site)));
    const grouped = Object.groupBy(results, (result) => result.category);
    return success({
      checkedAt: now(),
      checks: results,
      deployment: aggregate(grouped.deployment ?? []),
      dependencies: aggregate(grouped.dependency ?? []),
      health: aggregate(results),
      runtime: aggregate(grouped.runtime ?? []),
      services: aggregate(grouped.service ?? []),
      siteId
    });
  }

  return Object.freeze({ inspect });
}

function normalizeChecks(checks) {
  return Object.entries(checks).map(([name, definition]) => {
    const check = typeof definition === "function" ? { check: definition } : definition;
    if (!check || typeof check.check !== "function") throw new TypeError(`Health check "${name}" requires a check function.`);
    const category = check.category ?? "service";
    if (!["runtime", "service", "dependency", "build", "deployment"].includes(category)) throw new TypeError(`Health check "${name}" has unsupported category: ${category}.`);
    return { category, check: check.check, name };
  }).sort((first, second) => first.name.localeCompare(second.name));
}

async function executeCheck(check, siteId, site) {
  try {
    const result = await check.check(deepFreeze({ site, siteId }));
    const normalized = normalizeResult(result);
    return deepFreeze({ category: check.category, name: check.name, ...normalized });
  } catch (error) {
    return deepFreeze({ category: check.category, diagnostics: [{ code: "health.check.failed", message: error.message, severity: "error" }], name: check.name, state: HealthState.UNHEALTHY });
  }
}

function normalizeResult(result = {}) {
  if (typeof result === "string") result = { state: result };
  const state = Object.values(HealthState).includes(result.state) ? result.state : HealthState.UNKNOWN;
  return { diagnostics: [...(result.diagnostics ?? [])], details: result.details ?? null, state };
}

function aggregate(results) {
  const states = results.map((result) => result.state);
  if (states.includes(HealthState.UNHEALTHY)) return HealthState.UNHEALTHY;
  if (states.includes(HealthState.DEGRADED)) return HealthState.DEGRADED;
  if (states.length > 0 && states.every((state) => state === HealthState.HEALTHY)) return HealthState.HEALTHY;
  return HealthState.UNKNOWN;
}

function success(data) { return deepFreeze({ diagnostics: { errors: [], warnings: [] }, ok: true, schema: SITE_HEALTH_SCHEMA, schemaVersion: SITE_HEALTH_VERSION, ...data }); }
function failure(code, message) { return deepFreeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false, schema: SITE_HEALTH_SCHEMA, schemaVersion: SITE_HEALTH_VERSION }); }
