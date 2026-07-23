import { access, constants } from "node:fs/promises";
import path from "node:path";
import loadConfig from "../core/loadConfig.js";
import {
  checkReadablePath,
  checkWritableDirectory
} from "./checkEnvironment.js";
import {
  createError,
  createOk,
  createWarning
} from "./createValidationResult.js";

const SUPPORTED_ADAPTERS = new Set([
  "mock",
  "woocommerce",
  "wordpress",
  "wordpressWooCommerce"
]);

export default async function validateProjectConfig(projectDir) {
  const absoluteProjectDir = path.resolve(projectDir);
  const results = [];

  results.push(await checkReadablePath(path.join(absoluteProjectDir, "wpsc.config.js"), "Config file", {
    category: "configuration",
    fix: "Create wpsc.config.js or run the install wizard."
  }));

  let config;

  try {
    config = await loadConfig(absoluteProjectDir);
    results.push(createOk("Config syntax", config.name, {
      category: "configuration",
      summary: "wpsc.config.js exports a valid project config."
    }));
  } catch (error) {
    results.push(createError("Config syntax", error.message, {
      category: "configuration",
      fix: "Fix the config file before running build.",
      summary: "WPSC could not parse or validate project config."
    }));

    return results;
  }

  results.push(...await validateAdapter(config, absoluteProjectDir));
  results.push(...await validateTheme(config, absoluteProjectDir));
  results.push(await validateRuntimeConfiguration(absoluteProjectDir));
  results.push(...validateRouteConfig(config));
  results.push(await checkWritableDirectory(config._paths.outputDir, "Output directory", {
    category: "output",
    fix: "Create the output directory or grant write permission."
  }));
  results.push(validateBuildConfiguration(config));

  return results;
}

async function validateAdapter(config, projectDir) {
  const adapter = config.adapter ?? {};
  const results = [];

  if (!SUPPORTED_ADAPTERS.has(adapter.type)) {
    return [
      createError("Adapter type", String(adapter.type ?? "missing"), {
        category: "adapter",
        fix: `Use one of: ${[...SUPPORTED_ADAPTERS].join(", ")}.`,
        summary: "Adapter type is not supported."
      })
    ];
  }

  results.push(createOk("Adapter type", adapter.type, {
    category: "adapter",
    summary: `Adapter "${adapter.type}" is supported.`
  }));

  if (adapter.type === "mock") {
    results.push(await checkReadablePath(path.resolve(projectDir, adapter.source), "Adapter source", {
      category: "adapter",
      fix: "Check adapter.source in wpsc.config.js and make sure the content file exists."
    }));
  }

  if (adapter.type === "wordpress") {
    results.push(validateUrl("WordPress REST URL", adapter.baseUrl, "adapter.baseUrl"));
  }

  if (adapter.type === "woocommerce") {
    results.push(validateUrl("WooCommerce REST URL", adapter.baseUrl, "adapter.baseUrl"));
  }

  if (adapter.type === "wordpressWooCommerce") {
    results.push(validateUrl("WordPress REST URL", adapter.wordpress?.baseUrl, "adapter.wordpress.baseUrl"));
    results.push(validateUrl("WooCommerce REST URL", adapter.woocommerce?.baseUrl, "adapter.woocommerce.baseUrl"));
  }

  return results;
}

async function validateTheme(config, projectDir) {
  const checks = [];

  checks.push(await checkReadablePath(config._paths.themeLayout, "Theme layout", {
    category: "theme",
    fix: "Check theme.layout in wpsc.config.js and make sure the file exists."
  }));

  if (config._paths.themeComponents) {
    checks.push(await checkReadablePath(config._paths.themeComponents, "Theme components", {
      category: "theme",
      fix: "Check theme.components in wpsc.config.js."
    }));
  }

  if (config._paths.themeAssets) {
    checks.push(await checkReadablePath(config._paths.themeAssets, "Theme assets", {
      category: "theme",
      fix: "Check theme.assets in wpsc.config.js."
    }));
  }

  for (const [contentType, layoutPath] of Object.entries(config._paths.themeLayouts ?? {})) {
    checks.push(await checkReadablePath(layoutPath, `Theme layout: ${contentType}`, {
      category: "theme",
      fix: `Check theme.layouts.${contentType} in wpsc.config.js.`
    }));
  }

  return checks;
}

function validateRouteConfig(config) {
  const homepage = String(config.homepage ?? "").trim();

  if (!homepage) {
    return [
      createError("Homepage route", "missing", {
        category: "route",
        fix: "Set homepage to the slug of the homepage content.",
        summary: "Homepage slug is required."
      })
    ];
  }

  if (homepage.includes("/")) {
    return [
      createWarning("Homepage route", homepage, {
        category: "route",
        fix: "Use a plain slug without slashes for homepage.",
        summary: "Homepage slug contains a slash."
      })
    ];
  }

  return [
    createOk("Homepage route", homepage, {
      category: "route",
      summary: `Homepage slug is "${homepage}".`
    })
  ];
}

async function validateRuntimeConfiguration(projectDir) {
  const runtimeConfigPath = path.join(projectDir, "runtime.config.js");

  try {
    await access(runtimeConfigPath, constants.R_OK);

    return createOk("Runtime configuration", runtimeConfigPath, {
      category: "runtime",
      summary: "runtime.config.js is readable."
    });
  } catch {
    return createWarning("Runtime configuration", runtimeConfigPath, {
      category: "runtime",
      fix: "Create runtime.config.js when this project needs auth, account, cart, checkout, or order runtime APIs.",
      summary: "runtime.config.js is not present. This is acceptable for static-only projects."
    });
  }
}

function validateBuildConfiguration(config) {
  const outputDir = config.outputDir ?? config._paths?.outputDir;

  if (!outputDir) {
    return createError("Build output", "missing", {
      category: "build",
      fix: "Set outputDir in wpsc.config.js.",
      summary: "Build output directory is missing."
    });
  }

  return createOk("Build output", outputDir, {
    category: "build",
    summary: "Build output configuration is present."
  });
}

function validateUrl(name, value, fieldPath) {
  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Unsupported protocol");
    }

    return createOk(name, value, {
      category: "adapter",
      summary: `${fieldPath} is a valid HTTP URL.`
    });
  } catch {
    return createError(name, String(value ?? "missing"), {
      category: "adapter",
      fix: `Set ${fieldPath} to a valid http:// or https:// URL.`,
      summary: `${fieldPath} is not a valid HTTP URL.`
    });
  }
}
