import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createSiteHealthService, { HealthState } from "../framework/src/monitoring/createSiteHealthService.js";
import createSiteMetadata from "../framework/src/site/createSiteMetadata.js";
import createSiteRegistry from "../framework/src/site/createSiteRegistry.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

test("Site Health Service aggregates Site-aware Runtime, service and dependency checks", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-health-"));
  const repository = createSiteRepository({ workspaceDir });
  try {
    await repository.writeMetadata("alpha", createSiteMetadata({ name: "Alpha", uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1" }));
    const registry = createSiteRegistry({ repository });
    await registry.register({ siteId: "alpha", domains: ["alpha.example.test"] });
    const health = createSiteHealthService({
      registry,
      now: () => "2026-07-31T00:00:00.000Z",
      checks: {
        runtime: { category: "runtime", check: ({ siteId }) => ({ details: { siteId }, state: "healthy" }) },
        wordpress: { category: "dependency", check: () => ({ diagnostics: [{ code: "source.timeout", message: "Source is slow", severity: "warning" }], state: "degraded" }) },
        deployment: { category: "deployment", check: () => ({ state: "healthy" }) }
      }
    });
    const result = await health.inspect("alpha");

    assert.equal(result.ok, true);
    assert.equal(result.health, HealthState.DEGRADED);
    assert.equal(result.runtime, HealthState.HEALTHY);
    assert.equal(result.dependencies, HealthState.DEGRADED);
    assert.equal(result.checks.find((check) => check.name === "runtime").details.siteId, "alpha");
    assert.equal(Object.isFrozen(result), true);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Site Health Service reports check failures and unknown Sites without mutation", async () => {
  const registry = { listSites: async () => [{ siteId: "alpha" }] };
  const health = createSiteHealthService({ registry, checks: { queue: { category: "service", check: () => { throw new Error("Queue unavailable"); } } } });
  const result = await health.inspect("alpha");
  assert.equal(result.health, HealthState.UNHEALTHY);
  assert.equal(result.checks[0].diagnostics[0].code, "health.check.failed");
  assert.equal((await health.inspect("missing")).ok, false);
});
