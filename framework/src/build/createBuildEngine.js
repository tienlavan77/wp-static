import deepFreeze from "../shared/deepFreeze.js";
import { randomUUID } from "node:crypto";

export const BUILD_ENGINE_VERSION = "1.0";

export const BuildClient = Object.freeze({
  BROWSER: "browser",
  CLI: "cli",
  DASHBOARD: "dashboard"
});

export const BuildEvent = Object.freeze({
  COMPLETED: "build.completed",
  FAILED: "build.failed",
  PROGRESS: "build.progress",
  STARTED: "build.started"
});

export const BuildState = Object.freeze({
  BUILDING: "BUILDING",
  FAILED: "FAILED",
  IDLE: "IDLE",
  SUCCESS: "SUCCESS"
});

function diagnostic(code, message) {
  return { code, message, severity: "error" };
}

function normalizeClient(client) {
  return String(client || "").trim().toLowerCase();
}

export function validateBuildContext(context = {}) {
  const errors = [];
  if (!Object.values(BuildClient).includes(context.client)) {
    errors.push(diagnostic("build.context.client.invalid", "Build context client must be browser, cli, or dashboard."));
  }
  if (typeof context.siteId !== "string" || context.siteId.trim() === "") {
    errors.push(diagnostic("build.context.site_id.required", "Build context site id is required."));
  }
  return { errors, ok: errors.length === 0 };
}

export function createBuildContext(input = {}) {
  const context = deepFreeze({
    client: normalizeClient(input.client),
    siteId: typeof input.siteId === "string" ? input.siteId.trim() : ""
  });
  const validation = validateBuildContext(context);
  return {
    context,
    diagnostics: { errors: validation.errors, warnings: [] },
    ok: validation.ok
  };
}

export function createBuildResult(input = {}) {
  const diagnostics = input.diagnostics || { errors: [], warnings: [] };
  const generatedFiles = Array.isArray(input.generatedFiles) ? input.generatedFiles : [];
  return deepFreeze({
    buildId: input.buildId || null,
    context: input.context || null,
    diagnostics: deepFreeze({ errors: [...diagnostics.errors], warnings: [...diagnostics.warnings] }),
    duration: Number.isFinite(input.duration) ? input.duration : 0,
    events: deepFreeze([...(input.events || [])]),
    generatedFiles: deepFreeze([...generatedFiles]),
    ok: input.ok === true,
    output: null,
    status: input.status || BuildState.IDLE
  });
}

export default function createBuildEngine(options = {}) {
  const createId = options.createBuildId || randomUUID;
  const now = options.now || (() => new Date().toISOString());
  const builds = new Map();

  function result(build, events = [], diagnostics = { errors: [], warnings: [] }) {
    return createBuildResult({
      buildId: build.id,
      context: build.context,
      diagnostics,
      duration: build.finishedAt ? Date.parse(build.finishedAt) - Date.parse(build.startedAt) : 0,
      events,
      generatedFiles: build.generatedFiles,
      ok: build.status !== BuildState.FAILED,
      status: build.status
    });
  }

  function start(input = {}) {
    const contextResult = createBuildContext(input);
    if (!contextResult.ok) return createBuildResult({ diagnostics: contextResult.diagnostics, status: BuildState.FAILED });
    const build = { context: contextResult.context, finishedAt: null, generatedFiles: [], id: createId(), startedAt: now(), status: BuildState.BUILDING };
    builds.set(build.id, build);
    return result(build, [{ payload: { buildId: build.id, siteId: build.context.siteId }, timestamp: build.startedAt, type: BuildEvent.STARTED }]);
  }

  function finish(buildId, input = {}) {
    const build = builds.get(buildId);
    if (!build || build.status !== BuildState.BUILDING) return createBuildResult({ diagnostics: { errors: [diagnostic("build.workflow.finish.unavailable", "Build cannot be finished.")], warnings: [] }, status: BuildState.FAILED });
    build.generatedFiles = Array.isArray(input.generatedFiles) ? [...input.generatedFiles] : [];
    build.finishedAt = now();
    build.status = BuildState.SUCCESS;
    return result(build, [{ payload: { buildId, siteId: build.context.siteId }, timestamp: build.finishedAt, type: BuildEvent.COMPLETED }]);
  }

  function fail(buildId, input = {}) {
    const build = builds.get(buildId);
    const diagnostics = input.diagnostics || { errors: [diagnostic("build.workflow.failed", "Build failed.")], warnings: [] };
    if (!build || build.status !== BuildState.BUILDING) return createBuildResult({ diagnostics, status: BuildState.FAILED });
    build.finishedAt = now();
    build.status = BuildState.FAILED;
    return result(build, [{ payload: { buildId, siteId: build.context.siteId }, timestamp: build.finishedAt, type: BuildEvent.FAILED }], diagnostics);
  }

  return Object.freeze({
    createContext: createBuildContext,
    createResult: createBuildResult,
    fail,
    finish,
    start,
    version: BUILD_ENGINE_VERSION
  });
}
