import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createOperationalObservabilityService from "../framework/src/observability/createOperationalObservabilityService.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

test("Operational Observability writes structured Site-aware logs and redacts secrets", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-observability-"));
  try {
    const service = createOperationalObservabilityService({ repository: createSiteRepository({ workspaceDir }), now: () => "2026-07-31T00:00:00.000Z" });
    const entry = await service.record({ siteId: "alpha", service: "backup", operation: "create", result: "succeeded", jobId: "job-1", message: "Backup completed", context: { providerToken: "hidden" } });
    const audit = await service.audit({ siteId: "alpha", service: "backup", operation: "create", actor: { type: "operator", id: "tien" }, target: { backupId: "backup-1", consumerSecret: "hidden" } });
    assert.equal(entry.schema, "wpsc.operation-log");
    assert.equal(entry.context.providerToken, "[REDACTED]");
    assert.equal(audit.target.consumerSecret, "[REDACTED]");
    assert.equal((await service.listLogs("alpha")).length, 1);
    assert.equal((await service.listAuditEvents("alpha"))[0].actor.id, "tien");
    assert.equal((await service.listLogs("beta")).length, 0);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Operational Observability rejects incomplete structured records", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-observability-invalid-"));
  try {
    const service = createOperationalObservabilityService({ repository: createSiteRepository({ workspaceDir }) });
    await assert.rejects(service.record({ siteId: "alpha", operation: "create" }), /service is required/);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
