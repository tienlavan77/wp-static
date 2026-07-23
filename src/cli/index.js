#!/usr/bin/env node

import path from "node:path";
import cleanOutput from "../builder/cleanOutput.js";
import createInstallConfiguration from "../core/createInstallConfiguration.js";
import createProjectScaffold, { STARTER_TEMPLATES } from "../core/createProjectScaffold.js";
import doctorProject from "../core/doctorProject.js";
import loadConfig from "../core/loadConfig.js";
import buildProjectOnce from "../dev-server/buildProjectOnce.js";
import serveStatic from "../dev-server/serveStatic.js";
import startDevServer from "../dev-server/startDevServer.js";
import watchBuildProject from "../dev-server/watchBuildProject.js";
import runRsyncDeploy from "../deploy/runRsyncDeploy.js";
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
      previewToken: readOptionalArg(cliArgs, "--preview-token")
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

  if (cliArgs[0] === "serve") {
    await serveProject(readProjectArg(cliArgs), readPortArg(cliArgs));
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
  const { config, result, sitePlan } = await buildProjectOnce(projectArg, options);

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
  wpsc build [--project <project-dir>] [--changed <type:id>] [--preview --preview-token <token>] [--watch]
  wpsc clean [--project <project-dir>]
  wpsc create <project-name> [--template blank|blog|catalog|commerce|corporate]
  wpsc create --list-templates
  wpsc deploy rsync [--project <project-dir>] --target <user@host:/path/> [--dry-run]
  wpsc dev [--project <project-dir>] [--port <port>]
  wpsc doctor [--project <project-dir>] [--json]
  wpsc install [--project <project-dir>] [--wordpress-url <url>] [--woocommerce-url <url>] [--domain <url>] [--output-dir <dir>] [--theme <name>] [--site-name <name>] [--report <path>] [--force] [--json]
  wpsc serve [--project <project-dir>] [--port <port>]
  wpsc validate [--project <project-dir>] [--json]
  wpsc webhook [--project <project-dir>] [--port <port>] [--secret <secret>]
  wpsc --help
  wpsc --version`);
}

function printBuildSummary(config, sitePlan, result, activeLogger) {
  activeLogger.info(`Project: ${config.name}`);
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
