import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createEnvironmentConfigurationService from "../framework/src/product/createEnvironmentConfigurationService.js";
import createInstallationBootstrapService from "../framework/src/product/createInstallationBootstrapService.js";
import createProductConfigurationValidationService from "../framework/src/product/createProductConfigurationValidationService.js";
import createSiteMetadata from "../framework/src/site/createSiteMetadata.js";
import createSiteRegistry from "../framework/src/site/createSiteRegistry.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

test("Product Configuration Validation validates Product, paths, Registry, Site state and secret references", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-config-validation-"));
  try {
    const repository = createSiteRepository({ workspaceDir });
    await createInstallationBootstrapService({ repository, workspaceDir }).bootstrap();
    await repository.writeMetadata("alpha", createSiteMetadata({ name: "Alpha", uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1" }));
    await repository.writeSettings("alpha", { schema: "wpsc-site-settings", schemaVersion: 1, siteId: "alpha", features: {}, general: { locale: "vi", timezone: "UTC" }, runtime: {}, theme: {} });
    await createSiteRegistry({ repository }).register({ siteId: "alpha", domains: ["alpha.example.test"] });
    const environmentConfig = createEnvironmentConfigurationService().create({ secretReferences: { WPSC_AUTH_BRIDGE_SECRET: "WPSC_AUTH_BRIDGE_SECRET" } });
    const service = createProductConfigurationValidationService({ repository, workspaceDir });
    const result = await service.validate({ environmentConfig, nodeVersion: "20.0.0" });
    assert.equal(result.valid, true);
    assert.equal(result.invalid, false);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Product Configuration Validation reports invalid configuration without mutation", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-config-validation-invalid-"));
  try {
    const repository = createSiteRepository({ workspaceDir });
    const service = createProductConfigurationValidationService({ repository, workspaceDir });
    const result = await service.validate();
    assert.equal(result.valid, false);
    assert.equal(result.diagnostics.errors.some((error) => error.code === "product.configuration.read.failed"), true);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
