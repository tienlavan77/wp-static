import { access, readFile, readlink } from "node:fs/promises";
import path from "node:path";
import createProductConfigurationValidationService from "../createProductConfigurationValidationService.js";
import createProductMigrationService from "../createProductMigrationService.js";
import createCoreUpdateActivationService from "./createCoreUpdateActivationService.js";
import createCoreUpdateHealthService, { REQUIRED_CORE_HEALTH_CHECKS } from "./createCoreUpdateHealthService.js";
import createCoreUpdateMigrationService from "./createCoreUpdateMigrationService.js";
import createCoreUpdateOrchestrator from "./createCoreUpdateOrchestrator.js";
import createCoreUpdatePackageVerifier from "./createCoreUpdatePackageVerifier.js";
import createCoreUpdatePlanner from "./createCoreUpdatePlanner.js";
import createCoreUpdateRecoveryService from "./createCoreUpdateRecoveryService.js";
import createCoreUpdateReleaseService from "./createCoreUpdateReleaseService.js";
import createCoreUpdateService from "./createCoreUpdateService.js";
import createCoreUpdateStagingService from "./createCoreUpdateStagingService.js";
import { createLocalPackageSource } from "./createPackageSources.js";
import createCorePackageContent from "./createCorePackageContent.js";

export default function createCoreUpdateCoordinator(options = {}) {
  const workspaceDir = path.resolve(options.workspaceDir ?? process.cwd());
  const packageDirectory = path.resolve(options.packageDirectory ?? path.join(workspaceDir, "storage", "core-releases"));
  const source = options.source ?? createLocalPackageSource({ directory: packageDirectory });
  const release = createCoreUpdateReleaseService({ currentVersion: options.currentVersion, source });
  const recovery = createCoreUpdateRecoveryService({ workspaceDir });
  const staging = createCoreUpdateStagingService({ workspaceDir });
  const configuration = options.configuration ?? createProductConfigurationValidationService({ repository: options.repository, workspaceDir });
  const migrations = options.migrations ?? createReleaseMigrationService({ release, workspaceDir });
  const verifier = createCoreUpdatePackageVerifier({
    architecture: options.architecture,
    publicKey: options.publicKey,
    runtime: options.runtime
  });
  const planner = createCoreUpdatePlanner({ configurationValidator: configuration, migrationService: migrations, packageVerifier: verifier, releaseService: release });
  const migration = createCoreUpdateMigrationService({ configuration, migrations, staging });
  const activation = createCoreUpdateActivationService({ workspaceDir });
  const health = createCoreUpdateHealthService({ checks: options.healthChecks ?? createCoreHealthChecks(workspaceDir), recovery, workspaceDir });
  const orchestrator = createCoreUpdateOrchestrator({ services: { activation, health, lifecycle: createCoreUpdateService({ workspaceDir }), migration, planner, recovery, release, staging, verifier } });

  async function loadInput(input = {}) {
    if (input.package && input.packageDir) return input;
    const discovered = await release.check();
    if (!discovered.ok || !discovered.available) return input;
    const root = path.join(packageDirectory, discovered.available.packageId);
    const packageDir = input.packageDir ?? path.join(root, "core");
    const persistedContent = await readFile(path.join(root, "package.bin"));
    const actualContent = await createCorePackageContent(packageDir);
    if (!persistedContent.equals(actualContent)) throw new Error("Core package content does not match its staged file tree.");
    return {
      ...input,
      package: input.package ?? {
        content: persistedContent,
        manifest: JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"))
      },
      packageDir,
      recoveryId: input.recoveryId ?? `before-${discovered.available.version}`,
      validation: input.validation ?? {}
    };
  }

  return Object.freeze({
    check: orchestrator.check,
    history: orchestrator.history,
    plan: async (input = {}) => orchestrator.plan(await loadInput(input)),
    run: async (input = {}) => orchestrator.run(await loadInput(input)),
    status: orchestrator.status
  });
}

function createReleaseMigrationService({ release, workspaceDir }) {
  let service;
  async function get() {
    if (service) return service;
    const discovered = await release.check();
    const migrations = discovered.available ? [{
      fromVersion: discovered.currentVersion,
      id: `core-${discovered.currentVersion}-to-${discovered.available.version}`,
      migrate: ({ configuration }) => ({ configuration }),
      toVersion: discovered.available.version
    }] : [];
    service = createProductMigrationService({ migrations, workspaceDir });
    return service;
  }
  return Object.freeze({ plan: async (input) => (await get()).plan(input), run: async (input) => (await get()).run(input), status: async () => (await get()).status() });
}

export function createCoreHealthChecks(workspaceDir) {
  async function activeRoot() {
    const target = await readlink(path.join(workspaceDir, "core", "active"));
    const root = path.resolve(workspaceDir, "core", target);
    await access(root);
    return root;
  }
  async function moduleExists(relative) { try { await access(path.join(await activeRoot(), relative)); return { ok: true }; } catch { return { ok: false }; } }
  return Object.freeze({
    buildIntegration: () => moduleExists("framework/src/build/createBuildIntegration.js"),
    dispatcher: () => moduleExists("framework/src/scheduler/dispatcher/createJobDispatcher.js"),
    queue: () => moduleExists("framework/src/scheduler/queue"),
    runtime: async () => {
      try {
        const root = await activeRoot();
        await access(path.join(root, "framework", "src", "cli", "index.js"));
        try { await access(path.join(root, ".wpsc-health-fail")); return { ok: false }; }
        catch (error) { if (error.code === "ENOENT") return { ok: true }; throw error; }
      } catch { return { ok: false }; }
    },
    scheduler: () => moduleExists("framework/src/scheduler/policy/createScheduler.js")
  });
}

export function validateCoreHealthCheckOwnership(checks) {
  return REQUIRED_CORE_HEALTH_CHECKS.every((name) => typeof checks?.[name] === "function");
}
