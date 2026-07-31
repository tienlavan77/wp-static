import deepFreeze from "../../shared/deepFreeze.js";

export const RUNTIME_HARDENING_SCHEMA = "wpsc.runtime-hardening";
export const RUNTIME_HARDENING_VERSION = 1;
export const RuntimeReadiness = Object.freeze({ BLOCKED: "blocked", READY: "ready", RUNNING: "running", SHUTTING_DOWN: "shutting_down", STOPPED: "stopped" });

export default function createRuntimeHardeningService(options = {}) {
  const checks = options.checks ?? {};
  const maxConcurrent = Math.max(1, Number(options.maxConcurrent ?? 8));
  const requestTimeoutMs = Math.max(1, Number(options.requestTimeoutMs ?? 30_000));
  const maxAttempts = Math.max(1, Number(options.maxAttempts ?? 1));
  const failureThreshold = Math.max(1, Number(options.failureThreshold ?? 3));
  const shutdownTimeoutMs = Math.max(1, Number(options.shutdownTimeoutMs ?? 10_000));
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const circuits = new Map();
  const active = new Set();
  let readiness = RuntimeReadiness.BLOCKED;

  async function startup() {
    const results = [];
    for (const [name, check] of Object.entries(checks).sort(([first], [second]) => first.localeCompare(second))) {
      try { results.push({ name, ...(await check()) }); } catch (error) { results.push({ name, message: error.message, ok: false }); }
    }
    const ok = results.every((result) => result.ok !== false);
    readiness = ok ? RuntimeReadiness.READY : RuntimeReadiness.BLOCKED;
    return snapshot({ checks: results, diagnostics: ok ? { errors: [], warnings: [] } : { errors: results.filter((result) => result.ok === false).map((result) => ({ code: "runtime.startup.dependency.failed", message: `${result.name}: ${result.message || "Dependency check failed."}`, severity: "error" })), warnings: [] }, ok, readiness, schema: RUNTIME_HARDENING_SCHEMA, schemaVersion: RUNTIME_HARDENING_VERSION });
  }

  async function run(siteId, operation, input = {}) {
    if (readiness !== RuntimeReadiness.READY && readiness !== RuntimeReadiness.RUNNING) return failure("runtime.not_ready", `Runtime is ${readiness}.`);
    if (typeof operation !== "function") throw new TypeError("Runtime operation must be a function.");
    if (active.size >= maxConcurrent) return failure("runtime.capacity.exceeded", "Runtime operation capacity has been reached.");
    const key = `${siteId}:${input.name ?? "operation"}`;
    const circuit = circuits.get(key) ?? { failures: 0, state: "closed" };
    if (circuit.state === "open") return failure("runtime.circuit.open", "Runtime dependency circuit is open.");
    readiness = RuntimeReadiness.RUNNING;
    const task = executeWithBounds(operation, { ...input, siteId }, { circuit, key });
    active.add(task);
    try { return await task; } finally { active.delete(task); if (active.size === 0 && readiness === RuntimeReadiness.RUNNING) readiness = RuntimeReadiness.READY; }
  }

  async function shutdown(handler) {
    readiness = RuntimeReadiness.SHUTTING_DOWN;
    const deadline = Date.now() + shutdownTimeoutMs;
    while (active.size > 0 && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, Math.min(10, Math.max(1, deadline - Date.now()))));
    const forced = active.size > 0;
    if (typeof handler === "function") await withTimeout(Promise.resolve().then(handler), shutdownTimeoutMs);
    readiness = RuntimeReadiness.STOPPED;
    return snapshot({ forced, readiness, remainingOperations: active.size, ok: !forced });
  }

  function state() { return snapshot({ activeOperations: active.size, circuits: Object.fromEntries(circuits), readiness, schema: RUNTIME_HARDENING_SCHEMA, schemaVersion: RUNTIME_HARDENING_VERSION }); }
  return Object.freeze({ run, shutdown, startup, state });

  async function executeWithBounds(operation, input, context) {
    let lastError;
    for (let attempt = 1; attempt <= Math.max(1, Number(input.maxAttempts ?? maxAttempts)); attempt += 1) {
      try {
        const value = await withTimeout(Promise.resolve().then(() => operation(deepFreeze({ attempt, siteId: input.siteId ?? null }))), Number(input.timeoutMs ?? requestTimeoutMs));
        context.circuit.failures = 0; circuits.set(context.key, context.circuit);
        return snapshot({ attempt, ok: true, result: value });
      } catch (error) {
        lastError = error; context.circuit.failures += 1;
        if (context.circuit.failures >= failureThreshold) context.circuit.state = "open";
        circuits.set(context.key, context.circuit);
      }
    }
    return failure(lastError?.code === "RUNTIME_TIMEOUT" ? "runtime.operation.timeout" : "runtime.operation.failed", lastError?.message || "Runtime operation failed.");
  }
}

function withTimeout(operation, milliseconds) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { const error = new Error("Runtime operation timed out."); error.code = "RUNTIME_TIMEOUT"; reject(error); }, milliseconds);
    operation.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}
function snapshot(value) { return deepFreeze(value); }
function failure(code, message) { return snapshot({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false }); }
