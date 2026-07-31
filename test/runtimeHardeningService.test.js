import assert from "node:assert/strict";
import test from "node:test";
import createRuntimeHardeningService, { RuntimeReadiness } from "../framework/src/runtime/hardening/createRuntimeHardeningService.js";

test("Runtime Hardening gates startup and bounds operations with timeout and circuit breaker", async () => {
  let calls = 0;
  const service = createRuntimeHardeningService({ checks: { runtime: async () => ({ ok: true }) }, requestTimeoutMs: 5, maxAttempts: 1, failureThreshold: 2 });
  assert.equal((await service.startup()).readiness, RuntimeReadiness.READY);
  assert.equal((await service.run("alpha", async () => { calls += 1; throw new Error("source down"); }, { name: "source" })).ok, false);
  assert.equal((await service.run("alpha", async () => { calls += 1; throw new Error("source down"); }, { name: "source" })).ok, false);
  assert.equal((await service.run("alpha", async () => "never", { name: "source" })).diagnostics.errors[0].code, "runtime.circuit.open");
  assert.equal(calls, 2);
  const timeoutResult = await service.run("alpha", () => new Promise(() => {}), { name: "slow", timeoutMs: 5 });
  assert.equal(timeoutResult.diagnostics.errors[0].code, "runtime.operation.timeout");
});

test("Runtime Hardening blocks failed startup and performs deterministic shutdown", async () => {
  const service = createRuntimeHardeningService({ checks: { database: async () => ({ ok: false, message: "offline" }) }, shutdownTimeoutMs: 5 });
  assert.equal((await service.startup()).readiness, RuntimeReadiness.BLOCKED);
  assert.equal((await service.run("alpha", async () => "nope")).diagnostics.errors[0].code, "runtime.not_ready");
  const healthy = createRuntimeHardeningService({ checks: { runtime: async () => ({ ok: true }) } });
  await healthy.startup();
  assert.equal((await healthy.shutdown()).readiness, RuntimeReadiness.STOPPED);
});
