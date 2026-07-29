#!/usr/bin/env node

import path from "node:path";
import cleanOutput from "../builder/cleanOutput.js";
import createInstallConfiguration from "../core/createInstallConfiguration.js";
import createProjectScaffold, { STARTER_TEMPLATES } from "../core/createProjectScaffold.js";
import createSiteSetupCommand from "./createSiteSetupCommand.js";
import createSiteCreateCommand from "./createSiteCreateCommand.js";
import createRuntimeServeCommand from "./createRuntimeServeCommand.js";
import createRuntimeConfigureWordPressCommand, { LEGACY_WORDPRESS_RUNTIME_ENV_FILE, WORDPRESS_RUNTIME_ENV_FILE } from "./createRuntimeConfigureWordPressCommand.js";
import createSetupService from "../setup/createSetupService.js";
import createProvisioningService from "../provision/createProvisioningService.js";
import createSiteRepository from "../site/createSiteRepository.js";
import createSiteRuntimeInstance from "../runtime/createSiteRuntimeInstance.js";
import createRuntimeHttpServer from "../runtime/createRuntimeHttpServer.js";
import loadSiteRuntimeConfig from "../runtime/loadSiteRuntimeConfig.js";
import loadRuntimeEnvironment from "../runtime/loadRuntimeEnvironment.js";
import doctorProject from "../core/doctorProject.js";
import loadConfig from "../core/loadConfig.js";
import buildProjectOnce from "../dev-server/buildProjectOnce.js";
import buildProductionProjectOnce from "../dev-server/buildProductionProjectOnce.js";
import serveStatic from "../dev-server/serveStatic.js";
import startDevServer from "../dev-server/startDevServer.js";
import watchBuildProject from "../dev-server/watchBuildProject.js";
import runRsyncDeploy from "../deploy/runRsyncDeploy.js";
import createInstallationLock from "../release/createInstallationLock.js";
import buildReleasePackage from "../release/buildReleasePackage.js";
import validateReleasePackage from "../release/validateReleasePackage.js";
import createWebhookServer from "../webhook/createWebhookServer.js";
import { getPackageInfo } from "../index.js";
import createLogger from "../shared/createLogger.js";
import { formatValidationResults } from "../validation/formatValidationResults.js";
import validateProjectConfig from "../validation/validateProjectConfig.js";

const args = process.argv.slice(2);
const logger = createLogger({
  quiet: args.includes("--quiet"),
  verbose: args.includes("--verbose")
});

try {
  await main(args);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

async function main(cliArgs) {
  if (cliArgs.includes("--build-example")) {
    await buildProject("examples/basic-shop");
    return;
  }

  if (cliArgs.includes("--help") || cliArgs.includes("-h")) {
    printHelp();
    return;
  }

  if (cliArgs.includes("--version") || cliArgs.includes("-v")) {
    console.log(getPackageInfo().version);
    return;
  }

  if (cliArgs[0] === "build") {
    if (cliArgs.includes("--watch")) {
      await watchBuild(readProjectArg(cliArgs), {
        changed: readRepeatedArg(cliArgs, "--changed")
      });
      return;
    }

    await buildProject(readProjectArg(cliArgs), {
      changed: readRepeatedArg(cliArgs, "--changed"),
      preview: cliArgs.includes("--preview"),
      previewToken: readOptionalArg(cliArgs, "--preview-token"),
      production: cliArgs.includes("--production")
    });
    return;
  }

  if (cliArgs[0] === "clean") {
    await cleanProject(readProjectArg(cliArgs));
    return;
  }

  if (cliArgs[0] === "doctor") {
    await doctor(readProjectArg(cliArgs), {
      format: cliArgs.includes("--json") ? "json" : "text"
    });
    return;
  }

  if (cliArgs[0] === "dev") {
    await devProject(readProjectArg(cliArgs), readPortArg(cliArgs));
    return;
  }

  if (cliArgs[0] === "deploy" && cliArgs[1] === "rsync") {
    await deployRsync(readProjectArg(cliArgs), {
      dryRun: cliArgs.includes("--dry-run"),
      target: readOptionalArg(cliArgs, "--target")
    });
    return;
  }

  if (cliArgs[0] === "install") {
    await installProject(readProjectArg(cliArgs), {
      domain: readOptionalArg(cliArgs, "--domain"),
      force: cliArgs.includes("--force"),
      format: cliArgs.includes("--json") ? "json" : "text",
      outputDir: readOptionalArg(cliArgs, "--output-dir"),
      reportPath: readOptionalArg(cliArgs, "--report"),
      siteName: readOptionalArg(cliArgs, "--site-name"),
      theme: readOptionalArg(cliArgs, "--theme"),
      woocommerceUrl: readOptionalArg(cliArgs, "--woocommerce-url"),
      wordpressUrl: readOptionalArg(cliArgs, "--wordpress-url")
    });
    return;
  }

  if (cliArgs[0] === "release" && cliArgs[1] === "build") {
    await releaseBuild(readProjectArg(cliArgs), {
      clean: cliArgs.includes("--clean"),
      format: cliArgs.includes("--json") ? "json" : "text",
      mode: readOptionalArg(cliArgs, "--mode"),
      outputDir: readOptionalArg(cliArgs, "--output-dir"),
      packageName: readOptionalArg(cliArgs, "--package-name")
    });
    return;
  }

  if (cliArgs[0] === "release" && cliArgs[1] === "recover") {
    await releaseRecover(readOptionalArg(cliArgs, "--release-dir") || readProjectArg(cliArgs), {
      confirmed: cliArgs.includes("--confirm"),
      format: cliArgs.includes("--json") ? "json" : "text",
      reason: readOptionalArg(cliArgs, "--reason")
    });
    return;
  }

  if (cliArgs[0] === "release" && cliArgs[1] === "validate") {
    await releaseValidate(readOptionalArg(cliArgs, "--release-dir") || readProjectArg(cliArgs), {
      format: cliArgs.includes("--json") ? "json" : "text"
    });
    return;
  }

  if (cliArgs[0] === "serve") {
    await serveProject(readProjectArg(cliArgs), readPortArg(cliArgs));
    return;
  }

  if (cliArgs[0] === "site:setup") {
    const sourceType = readOptionalArg(cliArgs, "--source");
    await setupSite(readRequiredArg(cliArgs, "--site"), {
      advance: cliArgs.includes("--advance"),
      source: sourceType && {
        endpoint: readOptionalArg(cliArgs, "--endpoint"),
        type: sourceType
      },
      webhookUrl: readOptionalArg(cliArgs, "--webhook-url")
    });
    return;
  }

  if (cliArgs[0] === "site:create") {
    await createSite(readRequiredArg(cliArgs, "--site"), {
      domain: readOptionalArg(cliArgs, "--domain"),
      workspaceDir: readProjectArg(cliArgs)
    });
    return;
  }

  if (cliArgs[0] === "runtime:serve") {
    await serveSiteRuntime({
      configPath: readOptionalArg(cliArgs, "--config"),
      host: readOptionalArg(cliArgs, "--host") || "127.0.0.1",
      port: readPortArg(cliArgs),
      workspaceDir: readProjectArg(cliArgs)
    });
    return;
  }

  if (cliArgs[0] === "runtime:build") {
    await buildRuntimeSite(readRequiredArg(cliArgs, "--site"), {
      changed: readRepeatedArg(cliArgs, "--changed"),
      configPath: readOptionalArg(cliArgs, "--config"),
      workspaceDir: readProjectArg(cliArgs)
    });
    return;
  }

  if (cliArgs[0] === "runtime:configure-wordpress") {
    await configureRuntimeWordPress({
      webhookBaseUrl: readOptionalArg(cliArgs, "--webhook-base-url"),
      workspaceDir: readProjectArg(cliArgs)
    });
    return;
  }

  if (cliArgs[0] === "validate") {
    await validateProject(readProjectArg(cliArgs), {
      format: cliArgs.includes("--json") ? "json" : "text"
    });
    return;
  }

  if (cliArgs[0] === "webhook") {
    await webhookProject(readProjectArg(cliArgs), readPortArg(cliArgs), {
      secret: readOptionalArg(cliArgs, "--secret")
    });
    return;
  }

  if (cliArgs[0] === "create") {
    await createProject(cliArgs[1], {
      listTemplates: cliArgs.includes("--list-templates"),
      template: readOptionalArg(cliArgs, "--template")
    });
    return;
  }

  const info = getPackageInfo();

  console.log(`${info.name} ${info.version}`);
  printHelp();
}

async function buildProject(projectArg, options = {}) {
  const build = options.production
    ? await buildProductionProjectOnce(projectArg, options)
    : await buildProjectOnce(projectArg, options);
  const { config, result, sitePlan } = build;

  printBuildSummary(config, sitePlan, result, logger);
}

async function watchBuild(projectArg, options = {}) {
  const watcher = await watchBuildProject(projectArg, {
    changed: options.changed,
    logger
  });

  logger.info("Build watch mode running. Press Ctrl+C to stop.");

  const close = () => {
    watcher.close();
    process.exit(0);
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}

function readOptionalArg(cliArgs, flagName) {
  const flagIndex = cliArgs.indexOf(flagName);

  if (flagIndex === -1) {
    return null;
  }

  const value = cliArgs[flagIndex + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`CLI option "${flagName}" requires a value.`);
  }

  return value;
}

function readRequiredArg(cliArgs, flagName) {
  const value = readOptionalArg(cliArgs, flagName);

  if (!value) {
    throw new Error(`CLI option "${flagName}" is required.`);
  }

  return value;
}

function readRepeatedArg(cliArgs, flagName) {
  const values = [];

  for (let index = 0; index < cliArgs.length; index += 1) {
    if (cliArgs[index] !== flagName) {
      continue;
    }

    const value = cliArgs[index + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`CLI option "${flagName}" requires a value.`);
    }

    values.push(value);
  }

  return values;
}

function readProjectArg(cliArgs) {
  const projectFlagIndex = cliArgs.indexOf("--project");

  if (projectFlagIndex === -1) {
    return ".";
  }

  const projectArg = cliArgs[projectFlagIndex + 1];

  if (!projectArg || projectArg.startsWith("--")) {
    throw new Error('CLI option "--project" requires a project directory.');
  }

  return projectArg;
}

function readPortArg(cliArgs) {
  const portFlagIndex = cliArgs.indexOf("--port");

  if (portFlagIndex === -1) {
    return 8080;
  }

  const port = Number.parseInt(cliArgs[portFlagIndex + 1], 10);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('CLI option "--port" requires a valid port number.');
  }

  return port;
}

async function cleanProject(projectArg) {
  const projectDir = path.resolve(projectArg);
  const config = await loadConfig(projectDir);
  const outputDir = path.resolve(projectDir, config.outputDir);

  await cleanOutput(outputDir);
  logger.info(`Cleaned ${outputDir}`);
}

async function doctor(projectArg, options = {}) {
  const projectDir = path.resolve(projectArg);
  const checks = await doctorProject(projectDir);
  const failed = checks.filter((check) => !check.ok);
  const output = formatValidationResults(checks, {
    format: options.format
  });

  if (options.format === "json") {
    console.log(output);
  } else {
    logger.info(output);
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

async function validateProject(projectArg, options = {}) {
  const projectDir = path.resolve(projectArg);
  const checks = await validateProjectConfig(projectDir);
  const failed = checks.filter((check) => !check.ok);
  const output = formatValidationResults(checks, {
    format: options.format
  });

  if (options.format === "json") {
    console.log(output);
  } else {
    logger.info(output);
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

async function installProject(projectArg, options = {}) {
  const result = await createInstallConfiguration(projectArg, options);

  if (options.format === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  logger.info(`Install wizard generated configuration in ${result.projectDir}`);
  logger.info("Files:");

  for (const file of result.files) {
    logger.info(`  ${file}`);
  }
  logger.info(`Report: ${result.reportPath}`);

  const warnings = result.results.filter((check) => check.status === "warning");

  if (warnings.length > 0) {
    logger.info("Warnings:");
    for (const warning of warnings) {
      logger.info(`  ${warning.name}: ${warning.summary}`);
      if (warning.fix) {
        logger.info(`    Fix: ${warning.fix}`);
      }
    }
  }
}

async function serveProject(projectArg, port) {
  const projectDir = path.resolve(projectArg);
  const config = await loadConfig(projectDir);
  const outputDir = path.resolve(projectDir, config.outputDir);
  const server = serveStatic(outputDir, { port });

  logger.info(`Serving ${outputDir} at http://localhost:${port}`);

  const close = () => server.close(() => process.exit(0));
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}

async function setupSite(siteId, options = {}) {
  const command = createSiteSetupCommand({
    setupService: createSetupService(),
    write: (line) => logger.info(line)
  });
  const result = await command.run({
    advance: options.advance,
    siteId,
    source: options.source,
    webhookUrl: options.webhookUrl
  });

  if (!result.ok) {
    process.exitCode = 1;
  }
}

async function createSite(siteId, options = {}) {
  const workspaceDir = path.resolve(options.workspaceDir || process.cwd());
  const repository = createSiteRepository({ workspaceDir });
  const command = createSiteCreateCommand({
    provisioningService: createProvisioningService({ repository }),
    workspaceDir,
    write: (line) => logger.info(line)
  });
  const result = await command.run({ domain: options.domain, siteId });
  if (!result.ok) {
    for (const item of result.diagnostics.errors || []) logger.error?.(`[${item.severity || "error"}] ${item.code}: ${item.message}`);
    process.exitCode = 1;
  }
}

async function serveSiteRuntime(options = {}) {
  const workspaceDir = path.resolve(options.workspaceDir || process.cwd());
  // Load the retired file first so config/runtime.env always wins when both exist.
  const legacyEnvironment = await loadRuntimeEnvironment(path.join(workspaceDir, LEGACY_WORDPRESS_RUNTIME_ENV_FILE));
  if (!legacyEnvironment.ok) throw legacyEnvironment.error;
  const environment = await loadRuntimeEnvironment(path.join(workspaceDir, WORDPRESS_RUNTIME_ENV_FILE));
  if (!environment.ok) throw environment.error;
  const command = createRuntimeServeCommand({
    createHttpServer: createRuntimeHttpServer,
    createRuntimeInstance: createSiteRuntimeInstance,
    loadRuntimeConfig: loadSiteRuntimeConfig,
    write: (line) => logger.info(line)
  });
  const result = await command.run(options);
  if (!result.ok) {
    for (const item of result.diagnostics.errors || []) logger.error?.(`[${item.severity}] ${item.code}: ${item.message}`);
    process.exitCode = 1;
    return;
  }
  const close = () => { result.stop(); process.exit(0); };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}

async function buildRuntimeSite(siteId, options = {}) {
  const workspaceDir = path.resolve(options.workspaceDir || process.cwd());
  const legacyEnvironment = await loadRuntimeEnvironment(path.join(workspaceDir, LEGACY_WORDPRESS_RUNTIME_ENV_FILE));
  if (!legacyEnvironment.ok) throw legacyEnvironment.error;
  const environment = await loadRuntimeEnvironment(path.resolve(workspaceDir, WORDPRESS_RUNTIME_ENV_FILE));
  if (!environment.ok) throw environment.error;
  const loaded = await loadSiteRuntimeConfig({ configPath: options.configPath, workspaceDir });
  if (!loaded.ok) throw new Error(loaded.diagnostics.errors.map((item) => item.message).join(" "));
  const instance = createSiteRuntimeInstance({ ...loaded.config, workspaceDir: loaded.workspaceDir });
  const queued = instance.services.scheduler.trigger({ changed: options.changed || [], siteId, triggerType: "cli" });
  if (!queued.ok) throw new Error(queued.diagnostics.errors.map((item) => item.message).join(" "));
  const tick = await instance.services.scheduler.tick();
  const build = tick.dispatched?.build;
  if (!tick.ok || build?.status !== "SUCCESS") throw new Error(build?.diagnostics?.errors?.[0]?.message || "Runtime build failed.");
  logger.info(`Runtime Site: ${siteId}`);
  logger.info(`Mode: ${(options.changed || []).length > 0 ? "incremental" : "full"}`);
  logger.info(`Changed: ${(options.changed || []).join(", ") || "all routes"}`);
  logger.info(`Files published: ${build.generatedFiles.length}`);
}

async function configureRuntimeWordPress(options = {}) {
  const command = createRuntimeConfigureWordPressCommand({ workspaceDir: options.workspaceDir, write: (line) => logger.info(line) });
  await command.run({ webhookBaseUrl: options.webhookBaseUrl });
}

async function deployRsync(projectArg, options = {}) {
  if (!options.target) {
    throw new Error('CLI option "--target" is required for deploy rsync.');
  }

  const { config, result } = await buildProjectOnce(projectArg);

  await runRsyncDeploy({
    dryRun: options.dryRun,
    sourceDir: result.outputDir,
    target: options.target
  });

  logger.info(`Deployed ${config.name} to ${options.target}${options.dryRun ? " (dry run)" : ""}`);
}

async function releaseBuild(projectArg, options = {}) {
  const result = await buildReleasePackage({
    clean: options.clean,
    mode: options.mode,
    outputDir: options.outputDir,
    packageName: options.packageName,
    projectDir: projectArg
  });

  if (options.format === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  logger.info(`Release package created: ${result.outputDir}`);
  logger.info(`Mode: ${result.structure.mode}`);
  logger.info(`Manifest: ${result.manifestPath}`);
  logger.info("Copied:");
  for (const [name, targetPath] of Object.entries(result.copied)) {
    logger.info(`  ${name}: ${targetPath || "not found"}`);
  }
}

async function releaseRecover(releaseDir, options = {}) {
  const lock = createInstallationLock({
    releaseDir
  });
  const result = await lock.recover({
    confirmed: options.confirmed,
    reason: options.reason || "cli-release-recovery"
  });

  if (options.format === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.action === "none") {
    logger.info(`No installation lock found in ${lock.configDir}`);
    return;
  }

  logger.info(`Installation lock archived: ${result.archivedPath}`);
  logger.info(`Reason: ${result.reason}`);
}

async function releaseValidate(releaseDir, options = {}) {
  const result = await validateReleasePackage({
    releaseDir
  });

  if (options.format === "json") {
    console.log(JSON.stringify(result, null, 2));
  } else {
    logger.info(`Release validation: ${result.ok ? "OK" : "Error"}`);
    for (const checkResult of result.checks) {
      logger.info(`  [${checkResult.status}] ${checkResult.message}`);
    }
  }

  if (!result.ok) {
    process.exitCode = 1;
  }
}

async function devProject(projectArg, port) {
  const projectDir = path.resolve(projectArg);
  const devServer = await startDevServer(projectDir, {
    logger,
    port
  });

  logger.info(`Dev server running at http://localhost:${port}`);

  const close = () => {
    devServer.close();
    process.exit(0);
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}

async function webhookProject(projectArg, port, options = {}) {
  const projectDir = path.resolve(projectArg);
  const webhookServer = createWebhookServer({
    waitUntilBuilt: false,
    logger,
    projectDir,
    secret: options.secret
  });

  webhookServer.listen(port);
  logger.info(`Webhook receiver running at http://localhost:${port}/webhook/rebuild`);

  const close = () => {
    webhookServer.server.close(() => process.exit(0));
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}

async function createProject(projectName, options = {}) {
  if (options.listTemplates) {
    logger.info(`Available templates: ${STARTER_TEMPLATES.join(", ")}`);
    return;
  }

  if (!projectName) {
    throw new Error("Usage: wpsc create <project-name> [--template <template>]");
  }

  const result = await createProjectScaffold(projectName, {
    template: options.template
  });

  logger.info(`Created ${result.template} project at ${result.projectDir}`);
}

function printHelp() {
  console.log(`Usage:
  wpsc build [--project <project-dir>] [--changed <type:id>] [--preview --preview-token <token>] [--watch] [--production]
  wpsc clean [--project <project-dir>]
  wpsc create <project-name> [--template blank|blog|catalog|commerce|corporate]
  wpsc create --list-templates
  wpsc deploy rsync [--project <project-dir>] --target <user@host:/path/> [--dry-run]
  wpsc dev [--project <project-dir>] [--port <port>]
  wpsc doctor [--project <project-dir>] [--json]
  wpsc install [--project <project-dir>] [--wordpress-url <url>] [--woocommerce-url <url>] [--domain <url>] [--output-dir <dir>] [--theme <name>] [--site-name <name>] [--report <path>] [--force] [--json]
  wpsc release build [--project <project-dir>] [--output-dir <dir>] [--package-name <name>] [--mode vps|shared-hosting] [--clean] [--json]
  wpsc release recover [--release-dir <release-dir>] [--reason <text>] --confirm [--json]
  wpsc release validate [--release-dir <release-dir>] [--json]
  wpsc serve [--project <project-dir>] [--port <port>]
  wpsc site:create --site <site-id> [--domain <domain>] [--project <workspace>]
  wpsc site:setup --site <site-id> [--advance] [--source <type> --endpoint <url> --webhook-url <url>]
  wpsc runtime:serve [--config <runtime.config.js>] [--project <workspace>] [--host <host>] [--port <port>]
  wpsc runtime:build --site <site-id> [--config <runtime.config.js>] [--project <workspace>] [--changed <type:id>]
  wpsc runtime:configure-wordpress [--project <workspace>] [--webhook-base-url <url>]
  wpsc validate [--project <project-dir>] [--json]
  wpsc webhook [--project <project-dir>] [--port <port>] [--secret <secret>]
  wpsc --help
  wpsc --version`);
}

function printBuildSummary(config, sitePlan, result, activeLogger) {
  activeLogger.info(`Project: ${config.name}`);
  activeLogger.info(`Mode: ${result.productionBuild ? "production" : "development"}`);
  activeLogger.info(`Pages: ${result.pagesWritten}`);
  if (result.fullBuild === false) {
    activeLogger.info(`Incremental: ${result.changedRoutes.join(", ") || "no affected routes"}`);
  }
  activeLogger.info(`Assets copied: ${result.copiedPublicAssets ? "yes" : "no"}`);
  activeLogger.info(`Theme assets copied: ${result.copiedThemeAssets ? "yes" : "no"}`);
  activeLogger.info(`Remote assets downloaded: ${result.assetsDownloaded ?? 0}`);
  activeLogger.info(`Output: ${result.outputDir}`);
  activeLogger.info(`Manifest: ${result.manifestPath}`);
  activeLogger.info(`SEO outputs: ${(result.seoOutputs ?? []).join(", ") || "none"}`);
  activeLogger.info("Routes:");

  for (const page of sitePlan.pages) {
    activeLogger.info(`  ${page.route.path} -> ${page.route.outputPath}`);
  }

  activeLogger.verbose(`Project dir: ${config._paths.projectDir}`);
}
