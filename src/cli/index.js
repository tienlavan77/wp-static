#!/usr/bin/env node

import path from "node:path";
import { pathToFileURL } from "node:url";
import buildSite from "../builder/buildSite.js";
import compile from "../core/compile.js";
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

  if (cliArgs[0] === "build") {
    await buildProject(readProjectArg(cliArgs));
    return;
  }

  const info = getPackageInfo();

  console.log(`${info.name} ${info.version}`);
  console.log("Usage: wpsc build --project <project-dir>");
}

async function buildProject(projectArg) {
  const projectDir = path.resolve(projectArg);
  const configModule = await import(pathToFileURL(path.join(projectDir, "wpsc.config.js")).href);
  const config = configModule.default;
  const sitePlan = await compile(config, { projectDir });
  const result = await buildSite(sitePlan, {
    outputDir: path.resolve(projectDir, config.outputDir)
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
