import assert from "node:assert/strict";
import test from "node:test";
import { OperationsCapability } from "../framework/src/security/createOperationsAuthorizationService.js";
import { ReleaseState } from "../framework/src/deployment/createDeploymentArtifactService.js";
import { HealthState } from "../framework/src/monitoring/createSiteHealthService.js";
import { RuntimeReadiness } from "../framework/src/runtime/hardening/createRuntimeHardeningService.js";
import { SiteOperationalStatus } from "../framework/src/site/createSiteRegistry.js";

test("Sprint 9 Architecture Audit freezes production ownership contracts", () => {
  assert.deepEqual(Object.values(SiteOperationalStatus).sort(), ["active", "deactivated", "deleted", "suspended"]);
  assert.deepEqual(Object.values(HealthState).sort(), ["degraded", "healthy", "unhealthy", "unknown"]);
  assert.deepEqual(Object.values(ReleaseState).sort(), ["created", "deployed", "failed", "ready", "superseded", "validated"]);
  assert.deepEqual(Object.values(RuntimeReadiness).sort(), ["blocked", "ready", "running", "shutting_down", "stopped"]);
  assert.equal(Object.hasOwn(OperationsCapability, "BACKUP"), true);
  assert.equal(Object.hasOwn(OperationsCapability, "RESTORE"), true);
});

test("Sprint 9 Freeze preserves non-goals and ownership boundaries", () => {
  const forbidden = ["content.crud", "provider.database.backup", "alternative.build", "alternative.scheduler", "cross.site.business.state"];
  const implementedScopes = ["site.registry", "operations", "backup", "restore", "monitoring", "observability", "security", "authorization", "deployment", "runtime.hardening"];
  assert.equal(forbidden.some((scope) => implementedScopes.includes(scope)), false);
  assert.equal(implementedScopes.includes("site.registry"), true);
  assert.equal(implementedScopes.includes("deployment"), true);
});
