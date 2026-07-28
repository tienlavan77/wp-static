export const RUNTIME_ROUTER_VERSION = "1.0";

function response(status, body) { return { body, status }; }
function failure(code, message, status = 400) { return response(status, { diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false }); }

export default function createRuntimeRouter(options = {}) {
  const composition = options.composition;
  if (!composition || typeof composition.get !== "function") throw new TypeError("Runtime Router requires Runtime Composition.");

  function service(name) {
    try { return composition.get(name); } catch { return null; }
  }

  async function handle(request = {}) {
    const runtime = service("runtime");
    const resolved = await runtime.handle({ host: request.host });
    if (!resolved.ok) return failure("runtime.router.site.unavailable", resolved.diagnostics.errors[0]?.message || "Site is unavailable.", resolved.route === "not-found" ? 404 : 500);
    const path = request.path || "/";
    const method = String(request.method || "GET").toUpperCase();
    const body = request.body || {};
    const siteId = resolved.siteId;

    if (method === "GET" && path === "/") {
      if (resolved.route === "installer") return response(200, { ok: true, route: "installer", siteId });
      const dashboard = await service("dashboard").show(siteId);
      return response(dashboard.ok ? 200 : 500, { ...dashboard, route: "dashboard" });
    }
    if (method === "POST" && path === "/installer/start") return response(200, service("installer").begin(siteId));
    if (method === "POST" && path === "/installer/complete") {
      const result = await service("installer").complete({ configuration: body.configuration, sessionId: body.sessionId });
      return response(result.ok ? 200 : 400, result);
    }
    if (method === "GET" && path === "/dashboard") {
      const dashboard = await service("dashboard").show(siteId);
      return response(dashboard.ok ? 200 : 500, dashboard);
    }
    if (method === "POST" && path === "/dashboard/source/test") return invoke("dashboardSource", "testConnection", siteId, body);
    if (method === "POST" && path === "/dashboard/source/register") return invoke("dashboardSource", "register", siteId, body);
    if (method === "POST" && path === "/dashboard/webhook/register") return invoke("webhookRegistration", "register", siteId, body);
    if (method === "POST" && path === "/dashboard/build") return invoke("firstBuild", "build", siteId, body);
    return failure("runtime.router.route.not_found", "Runtime endpoint was not found.", 404);
  }

  async function invoke(serviceName, method, siteId, body) {
    const controller = service(serviceName);
    if (!controller || typeof controller[method] !== "function") return failure("runtime.router.service.unavailable", "Runtime service is not configured.", 503);
    const result = await controller[method](siteId, body);
    return response(result.ok ? 200 : 400, result);
  }

  return Object.freeze({ handle, version: RUNTIME_ROUTER_VERSION });
}
