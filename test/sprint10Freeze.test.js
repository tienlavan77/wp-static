import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const reports = [
  "commit-001-product-manifest-versioning.md",
  "commit-002-installation-bootstrap-package.md",
  "commit-003-environment-configuration.md",
  "commit-004-cli-product-management.md",
  "commit-005-upgrade-migration-framework.md",
  "commit-006-configuration-validation.md",
  "commit-007-product-packaging-distribution-artifact.md",
  "commit-008-personal-edition-profile.md",
  "commit-009-installation-upgrade-e2e.md",
  "commit-010-product-diagnostics-support-bundle.md",
  "commit-011-architecture-packaging-audit.md"
];

test("Sprint 10 Freeze has a PASS deliverable report for every implementation commit", async () => {
  for (const report of reports) await access(path.join("outputs", "sprint-10", report));
  assert.equal(reports.length, 11);
});
