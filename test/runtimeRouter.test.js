import assert from "node:assert/strict";
import test from "node:test";
import createRuntimeRouter from "../src/runtime/createRuntimeRouter.js";

function composition(services) { return { get: (name) => { if (!services[name]) throw new Error("missing"); return services[name]; } }; }

test("Runtime Router dispatches installer and dashboard requests by resolved Site", async () => {
  const calls = [];
  const router = createRuntimeRouter({ composition: composition({
    dashboard: { show: async (siteId) => ({ diagnostics: { errors: [], warnings: [] }, ok: true, siteId }) },
    installer: { begin: (siteId) => ({ diagnostics: { errors: [], warnings: [] }, ok: true, siteId }), complete: async (input) => ({ ...input, diagnostics: { errors: [], warnings: [] }, ok: true }) },
    runtime: { handle: async () => ({ diagnostics: { errors: [], warnings: [] }, ok: true, route: "installer", siteId: "company-a" }) }
  }) });
  const root = await router.handle({ host: "example.test", method: "GET", path: "/" });
  const started = await router.handle({ host: "example.test", method: "POST", path: "/installer/start" });
  assert.equal(root.body.route, "installer");
  assert.equal(started.body.siteId, "company-a");
  calls.push(root.status, started.status);
  assert.deepEqual(calls, [200, 200]);
});

test("Runtime Router dispatches source, webhook, and first build only to injected controllers", async () => {
  const calls = [];
  const controller = (name) => ({ register: async (siteId) => { calls.push(`${name}:${siteId}`); return { diagnostics: { errors: [], warnings: [] }, ok: true }; } });
  const router = createRuntimeRouter({ composition: composition({
    dashboardSource: { register: async (siteId) => { calls.push(`source:${siteId}`); return { diagnostics: { errors: [], warnings: [] }, ok: true }; }, testConnection: async () => ({ diagnostics: { errors: [], warnings: [] }, ok: true }) },
    firstBuild: { build: async (siteId) => { calls.push(`build:${siteId}`); return { diagnostics: { errors: [], warnings: [] }, ok: true }; } },
    runtime: { handle: async () => ({ diagnostics: { errors: [], warnings: [] }, ok: true, route: "dashboard", siteId: "company-a" }) },
    webhookRegistration: controller("webhook")
  }) });
  await router.handle({ method: "POST", path: "/dashboard/source/register" });
  await router.handle({ method: "POST", path: "/dashboard/webhook/register" });
  await router.handle({ method: "POST", path: "/dashboard/build" });
  assert.deepEqual(calls, ["source:company-a", "webhook:company-a", "build:company-a"]);
});

test("Runtime Router serves Browser views while retaining REST actions as JSON", async () => {
  const router = createRuntimeRouter({ composition: composition({
    browserViews: { dashboard: () => "<main>dashboard</main>", installer: (siteId) => `<main>installer:${siteId}</main>` },
    dashboard: { show: async () => ({ diagnostics: { errors: [], warnings: [] }, metadata: { name: "Company A" }, ok: true, source: {} }) },
    runtime: { handle: async () => ({ diagnostics: { errors: [], warnings: [] }, ok: true, route: "installer", siteId: "company-a" }) }
  }) });
  const page = await router.handle({ method: "GET", path: "/" });
  assert.equal(page.headers["content-type"], "text/html; charset=utf-8");
  assert.equal(page.body, "<main>installer:company-a</main>");
});

test("Runtime Router delegates Account API requests to the Site Commerce Gateway", async () => {
  const router = createRuntimeRouter({ composition: composition({
    commerceGateway: { handle: async (siteId, request) => ({ body: { authenticated: false, ok: true, siteId }, status: 200 }) },
    runtime: { handle: async () => ({ diagnostics: { errors: [], warnings: [] }, ok: true, route: "dashboard", siteId: "company-a" }) }
  }) });
  const session = await router.handle({ method: "GET", path: "/api/account/me" });
  assert.equal(session.status, 200);
  assert.deepEqual(session.body, { authenticated: false, ok: true, siteId: "company-a" });
});
