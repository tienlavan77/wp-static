#!/usr/bin/env node

import path from "node:path";
import buildSite from "../framework/src/builder/buildSite.js";
import compile from "../framework/src/core/compile.js";
import loadConfig from "../framework/src/core/loadConfig.js";

const args = process.argv.slice(2);

try {
  await main(args);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

async function main(cliArgs) {
  const projectDir = path.resolve(readOption(cliArgs, "--project") ?? "fixtures/basic-shop");
  const routePath = normalizeRoutePath(readOption(cliArgs, "--route") ?? cliArgs[0] ?? "/");
  const useMock = cliArgs.includes("--mock");
  const withRelated = cliArgs.includes("--with-related");
  const config = await loadConfig(projectDir);
  const outputDir = config._paths.outputDir;
  const buildConfig = useMock
    ? {
        ...config,
        adapter: {
          source: "./content.json",
          type: "mock"
        },
        homepage: "home",
        _paths: {
          ...config._paths,
          outputDir
        }
      }
    : config;
  const sitePlan = await compile(buildConfig, {
    cacheBust: Date.now(),
    cacheDir: path.join(projectDir, ".wpsc", "cache"),
    disableRouteRenderCache: true,
    projectDir
  });
  const page = sitePlan.pages.find((item) => item.route.path === routePath);

  if (!page) {
    const knownRoutes = sitePlan.pages.map((item) => item.route.path).slice(0, 20).join(", ");
    throw new Error(`Route "${routePath}" not found. Known routes include: ${knownRoutes}`);
  }

  const routesToBuild = withRelated
    ? findRelatedRoutes(sitePlan.pages, page)
    : [routePath];

  const result = await buildSite(sitePlan, {
    config: buildConfig,
    incremental: {
      changedRoutes: routesToBuild,
      fullBuild: false
    },
    outputDir,
    publicDir: buildConfig._paths.publicDir,
    site: buildConfig.site,
    themeAssetsDir: sitePlan.theme?.assetsDir ?? undefined
  });

  console.log(`Built route ${routePath} -> ${path.join(outputDir, page.route.outputPath)}`);
  if (withRelated && routesToBuild.length > 1) {
    console.log(`Related routes: ${routesToBuild.join(", ")}`);
  }
  console.log(`Pages written: ${result.pagesWritten}/${result.totalPages}`);
}

function findRelatedRoutes(pages, page) {
  const archive = page.route.archive;

  if (!archive?.term?.slug || !archive.taxonomy) {
    return [page.route.path];
  }

  return pages
    .filter((candidate) => {
      const candidateArchive = candidate.route.archive;

      return candidateArchive?.taxonomy === archive.taxonomy &&
        candidateArchive.term?.slug === archive.term.slug;
    })
    .map((candidate) => candidate.route.path);
}

function readOption(cliArgs, name) {
  const index = cliArgs.indexOf(name);

  if (index === -1) {
    return null;
  }

  const value = cliArgs[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`Option "${name}" requires a value.`);
  }

  return value;
}

function normalizeRoutePath(value) {
  const routePath = String(value ?? "/").trim();

  if (routePath === "" || routePath === "/") {
    return "/";
  }

  return `/${routePath.replace(/^\/+|\/+$/g, "")}`;
}
