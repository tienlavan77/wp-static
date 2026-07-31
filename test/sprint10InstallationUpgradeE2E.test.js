import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createSiteBackupService from "../framework/src/backup/createSiteBackupService.js";
import createDeploymentArtifactService from "../framework/src/deployment/createDeploymentArtifactService.js";
import createDeploymentOrchestrationService from "../framework/src/deployment/createDeploymentOrchestrationService.js";
import createEnvironmentConfigurationService from "../framework/src/product/createEnvironmentConfigurationService.js";
import createInstallationBootstrapService from "../framework/src/product/createInstallationBootstrapService.js";
import createProductConfigurationValidationService from "../framework/src/product/createProductConfigurationValidationService.js";
import createProductMigrationService from "../framework/src/product/createProductMigrationService.js";
import createSiteMetadata from "../framework/src/site/createSiteMetadata.js";
import createSiteRegistry from "../framework/src/site/createSiteRegistry.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";
import createRuntimeHardeningService from "../framework/src/runtime/hardening/createRuntimeHardeningService.js";

test("Sprint 10 installs, upgrades and preserves existing multi-Site production operation", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-sprint10-e2e-"));
  try {
    const repository = createSiteRepository({ workspaceDir });
    const runtime = createRuntimeHardeningService({ checks: { runtime: async () => ({ ok: true }) } });
    const bootstrap = createInstallationBootstrapService({ repository, workspaceDir, validateRuntime: () => runtime.startup() });
    const installed = await bootstrap.bootstrap({ version: "1.0.0" });
    assert.equal(installed.ok, true);
    assert.equal((await bootstrap.bootstrap({ version: "2.0.0" })).configuration.product.version, "1.0.0");

    const registry = createSiteRegistry({ repository });
    for (const [siteId, uuid] of [["alpha", "8d20de63-68f1-43cf-a28f-f62a347695a1"], ["beta", "a489abcf-7f73-476e-9ddd-e55db4f66a55"]]) {
      await repository.writeMetadata(siteId, createSiteMetadata({ name: siteId, uuid }));
      await repository.writeSettings(siteId, { schema: "wpsc-site-settings", schemaVersion: 1, siteId, features: {}, general: { locale: "vi", timezone: "UTC" }, runtime: {}, theme: {} });
      await repository.writeSourceMetadata(siteId, { endpoint: `https://${siteId}.source.test`, schema: "source-metadata", schemaVersion: 1, sourceType: "wordpress" });
      await registry.register({ siteId, domains: [`${siteId}.example.test`] });
      const output = path.join(repository.resolveSiteRoot(siteId), "public", "dist");
      await mkdir(output, { recursive: true });
      await writeFile(path.join(output, "index.html"), `<h1>${siteId}</h1>`);
    }

    const environmentConfig = createEnvironmentConfigurationService().create({ secretReferences: { WPSC_AUTH_BRIDGE_SECRET: "WPSC_AUTH_BRIDGE_SECRET" } });
    const validation = await createProductConfigurationValidationService({ repository, workspaceDir }).validate({ environmentConfig, nodeVersion: "20.0.0" });
    assert.equal(validation.valid, true);
    assert.equal(JSON.stringify(environmentConfig).includes("actual-secret"), false);

    const backups = createSiteBackupService({ repository, registry });
    await backups.create("alpha", { backupId: "pre-upgrade" });
    assert.equal((await backups.verify("alpha", "pre-upgrade")).verified, true);

    let shouldFail = true;
    const migrations = createProductMigrationService({ workspaceDir, migrations: [{ id: "upgrade-1-1", fromVersion: "1.0.0", toVersion: "1.1.0", migrate: ({ configuration }) => { if (shouldFail) throw new Error("intentional checkpoint"); return { configuration: { ...configuration, upgraded: true } }; } }] });
    assert.equal((await migrations.run({ fromVersion: "1.0.0", toVersion: "1.1.0" })).ok, false);
    shouldFail = false;
    assert.equal((await migrations.run({ fromVersion: "1.0.0", toVersion: "1.1.0" })).ok, true);
    assert.equal(JSON.parse(await readFile(path.join(workspaceDir, "config", "wpsc.json"), "utf8")).upgraded, true);
    assert.equal((await registry.resolveByDomain("beta.example.test")).siteId, "beta");

    const artifacts = createDeploymentArtifactService({ repository });
    await artifacts.create("alpha", { artifactId: "alpha-upgrade", buildRef: "upgrade-build", version: "1.1.0" });
    await artifacts.validate("alpha", "alpha-upgrade");
    await artifacts.markReady("alpha", "alpha-upgrade");
    const deployment = createDeploymentOrchestrationService({ artifactService: artifacts, repository, deployer: { deploy: async () => undefined, activate: async () => undefined } });
    assert.equal((await deployment.deploy("alpha", "alpha-upgrade", { deploymentId: "alpha-upgrade-deploy" })).deployment.state, "deployed");
    assert.equal((await runtime.run("alpha", async ({ siteId }) => siteId)).result, "alpha");
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
