export const RUNTIME_ROUTER_VERSION = "1.0";

function response(status, body, headers = null) { return { body, headers, status }; }
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

    if (path.startsWith("/api/")) {
      const commerceGateway = service("commerceGateway");
      if (!commerceGateway) return failure("runtime.account.unavailable", "Account service is not configured.", 503);
      return commerceGateway.handle(siteId, request);
    }

    const webhookMatch = path.match(/^\/webhook\/([a-z0-9-]+)$/i);
    if (webhookMatch) {
      const receiver = service("webhookReceiver");
      if (!receiver) return failure("runtime.webhook.receiver.unavailable", "Webhook receiver is not configured.", 503);
      const result = await receiver.handle(siteId, webhookMatch[1], request);
      return response(result.status, result.body);
    }

    if (method === "GET" && path === "/") {
      const browserViews = service("browserViews");
      if (resolved.route === "installer") return browserViews ? response(200, browserViews.installer(siteId), { "content-type": "text/html; charset=utf-8" }) : response(200, { ok: true, route: "installer", siteId });
      const dashboard = await service("dashboard").show(siteId);
      return browserViews ? response(dashboard.ok ? 200 : 500, browserViews.dashboard(dashboard), { "content-type": "text/html; charset=utf-8" }) : response(dashboard.ok ? 200 : 500, { ...dashboard, route: "dashboard" });
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
