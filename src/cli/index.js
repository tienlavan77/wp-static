#!/usr/bin/env node

import path from "node:path";
import { cp, mkdir, stat } from "node:fs/promises";
import buildSite from "../builder/buildSite.js";
import compile from "../core/compile.js";
import loadConfig from "../core/loadConfig.js";
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

  console.log(`Built ${result.pagesWritten} pages to ${result.outputDir}`);
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
  wpsc create <project-name>
  wpsc --help
  wpsc --version`);
}
