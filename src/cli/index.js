#!/usr/bin/env node

import path from "node:path";
import { cp, mkdir, stat } from "node:fs/promises";
import buildSite from "../builder/buildSite.js";
import cleanOutput from "../builder/cleanOutput.js";
import compile from "../core/compile.js";
import doctorProject from "../core/doctorProject.js";
import loadConfig from "../core/loadConfig.js";
import serveStatic from "../dev-server/serveStatic.js";
import { getPackageInfo } from "../index.js";

const args = process.argv.slice(2);

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
    await buildProject(readProjectArg(cliArgs));
    return;
  }

  if (cliArgs[0] === "clean") {
    await cleanProject(readProjectArg(cliArgs));
    return;
  }

  if (cliArgs[0] === "doctor") {
    await doctor(readProjectArg(cliArgs));
    return;
  }

  if (cliArgs[0] === "serve") {
    await serveProject(readProjectArg(cliArgs), readPortArg(cliArgs));
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

async function buildProject(projectArg) {
  const projectDir = path.resolve(projectArg);
  const config = await loadConfig(projectDir);
  const sitePlan = await compile(config, { projectDir });
  const result = await buildSite(sitePlan, {
    outputDir: path.resolve(projectDir, config.outputDir),
    publicDir: config.publicDir ? path.resolve(projectDir, config.publicDir) : undefined
  });

  printBuildSummary(config, sitePlan, result);
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
  console.log(`Cleaned ${outputDir}`);
}

async function doctor(projectArg) {
  const projectDir = path.resolve(projectArg);
  const checks = await doctorProject(projectDir);
  const failed = checks.filter((check) => !check.ok);

  for (const check of checks) {
    console.log(`${check.ok ? "OK" : "FAIL"} ${check.name}: ${check.detail}`);
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

  console.log(`Serving ${outputDir} at http://localhost:${port}`);

  const close = () => server.close(() => process.exit(0));
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

  console.log(`Created project at ${targetDir}`);
}

function printHelp() {
  console.log(`Usage:
  wpsc build [--project <project-dir>]
  wpsc clean [--project <project-dir>]
  wpsc create <project-name>
  wpsc doctor [--project <project-dir>]
  wpsc serve [--project <project-dir>] [--port <port>]
  wpsc --help
  wpsc --version`);
}

function printBuildSummary(config, sitePlan, result) {
  console.log(`Project: ${config.name}`);
  console.log(`Pages: ${result.pagesWritten}`);
  console.log(`Assets copied: ${result.copiedPublicAssets ? "yes" : "no"}`);
  console.log(`Output: ${result.outputDir}`);
  console.log("Routes:");

  for (const page of sitePlan.pages) {
    console.log(`  ${page.route.path} -> ${page.route.outputPath}`);
  }
}
