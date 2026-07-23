#!/usr/bin/env node

import path from "node:path";
import { cp, mkdir, stat } from "node:fs/promises";
import cleanOutput from "../builder/cleanOutput.js";
import doctorProject from "../core/doctorProject.js";
import loadConfig from "../core/loadConfig.js";
import buildProjectOnce from "../dev-server/buildProjectOnce.js";
import serveStatic from "../dev-server/serveStatic.js";
import startDevServer from "../dev-server/startDevServer.js";
import runRsyncDeploy from "../deploy/runRsyncDeploy.js";
import createWebhookServer from "../webhook/createWebhookServer.js";
import { getPackageInfo } from "../index.js";
import createLogger from "../shared/createLogger.js";
import { formatValidationResults } from "../validation/formatValidationResults.js";

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

  if (cliArgs[0] === "serve") {
    await serveProject(readProjectArg(cliArgs), readPortArg(cliArgs));
    return;
  }

  if (cliArgs[0] === "webhook") {
    await webhookProject(readProjectArg(cliArgs), readPortArg(cliArgs), {
      secret: readOptionalArg(cliArgs, "--secret")
    });
    return;
  }

  if (cliArgs[0] === "create") {
    await createProject(cliArgs[1]);
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

async function createProject(projectName) {
  if (!projectName) {
    throw new Error("Usage: wpsc create <project-name>");
  }

  const targetDir = path.resolve(projectName);

  try {
    await stat(targetDir);
    throw new Error(`Project already exists: ${targetDir}`);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  await mkdir(path.dirname(targetDir), { recursive: true });
  await cp(path.resolve("templates/basic-shop"), targetDir, {
    recursive: true,
    errorOnExist: true,
    force: false
  });

  logger.info(`Created project at ${targetDir}`);
}

function printHelp() {
  console.log(`Usage:
  wpsc build [--project <project-dir>] [--changed <type:id>] [--preview --preview-token <token>]
  wpsc clean [--project <project-dir>]
  wpsc create <project-name>
  wpsc deploy rsync [--project <project-dir>] --target <user@host:/path/> [--dry-run]
  wpsc dev [--project <project-dir>] [--port <port>]
  wpsc doctor [--project <project-dir>] [--json]
  wpsc serve [--project <project-dir>] [--port <port>]
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
