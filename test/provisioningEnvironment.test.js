import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createError, createOk } from "../src/validation/createValidationResult.js";
import validateProvisioningEnvironment, {
  PROVISIONING_ENVIRONMENT_VERSION,
  ProvisioningEnvironmentSeverity
} from "../src/provision/validateProvisioningEnvironment.js";

test("validateProvisioningEnvironment accepts a supported runtime and writable sites directory", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-provision-environment-"));

  try {
    const result = await validateProvisioningEnvironment({
      checks: {
        node: async () => createOk("Node.js >= 20", "v22.0.0", {
          category: "environment",
          summary: "Node.js is supported."
        }),
        sitesDir: async () => createOk("Workspace sites directory", workspaceDir, {
          category: "filesystem",
          summary: "Workspace sites directory is writable."
        })
      },
      sitesDir: workspaceDir
    });

    assert.equal(result.ok, true);
    assert.equal(result.version, PROVISIONING_ENVIRONMENT_VERSION);
    assert.deepEqual(result.summary, { error: 0, ok: 2, total: 2, warning: 0 });
  assert.deepEqual(result.diagnostics, { errors: [], warnings: [] });
  assert.deepEqual(
    result.results.map((item) => item.severity),
    [ProvisioningEnvironmentSeverity.INFO, ProvisioningEnvironmentSeverity.INFO]
  );
  } finally {
    await rm(workspaceDir, { force: true, recursive: true });
  }
});

test("validateProvisioningEnvironment returns normalized diagnostics for failed checks", async () => {
  const result = await validateProvisioningEnvironment({
    checks: {
      node: async () => createError("Node.js >= 20", "v18.0.0", {
        category: "environment",
        fix: "Upgrade Node.js.",
        summary: "Node.js is unsupported."
      }),
      sitesDir: async () => createOk("Workspace sites directory", "/tmp/sites", {
        category: "filesystem"
      })
    },
    sitesDir: "/tmp/sites"
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.summary, { error: 1, ok: 1, total: 2, warning: 0 });
  assert.deepEqual(result.diagnostics.errors, [{
    category: "environment",
    code: "provision.environment.environment.node.js.20",
    detail: "v18.0.0",
    fix: "Upgrade Node.js.",
    message: "Node.js is unsupported.",
    name: "Node.js >= 20",
    severity: ProvisioningEnvironmentSeverity.ERROR,
    status: "error"
  }]);
});

test("validateProvisioningEnvironment requires the workspace sites directory", async () => {
  await assert.rejects(
    () => validateProvisioningEnvironment(),
    /requires options\.sitesDir/
  );
});
