import path from "node:path";
import {
  checkNodeVersion,
  checkPhpVersion,
  checkWritableDirectory
} from "../validation/checkEnvironment.js";
import { summarizeValidationResults } from "../validation/createValidationResult.js";

export const INSTALLATION_ENVIRONMENT_VERSION = "1.0";

function createResultCode(result) {
  return `install.environment.${result.category}.${result.name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function toDiagnostic(result) {
  return {
    category: result.category,
    code: createResultCode(result),
    detail: result.detail,
    fix: result.fix,
    message: result.summary,
    name: result.name,
    status: result.status
  };
}

function validateSsl(domain) {
  if (!domain) {
    return {
      category: "ssl",
      detail: "missing",
      fix: "Set the public site domain before production installation.",
      name: "SSL",
      ok: true,
      status: "warning",
      summary: "Domain is not configured yet, so SSL cannot be verified."
    };
  }

  try {
    const url = new URL(domain);

    if (url.protocol === "https:") {
      return {
        category: "ssl",
        detail: domain,
        fix: null,
        name: "SSL",
        ok: true,
        status: "ok",
        summary: "Domain uses HTTPS."
      };
    }

    return {
      category: "ssl",
      detail: domain,
      fix: "Use an HTTPS domain before production installation.",
      name: "SSL",
      ok: true,
      status: "warning",
      summary: "Domain does not use HTTPS."
    };
  } catch {
    return {
      category: "ssl",
      detail: domain,
      fix: "Enter a valid http:// or https:// domain.",
      name: "SSL",
      ok: false,
      status: "error",
      summary: "Domain is not a valid URL."
    };
  }
}

function validateRuntimeCompatibility(runtimeConfig) {
  if (!runtimeConfig) {
    return {
      category: "runtime",
      detail: "not provided",
      fix: null,
      name: "Runtime compatibility",
      ok: true,
      status: "warning",
      summary: "Runtime configuration has not been generated yet."
    };
  }

  if (runtimeConfig.ok === false) {
    return {
      category: "runtime",
      detail: "invalid",
      fix: "Fix runtime configuration errors before installation continues.",
      name: "Runtime compatibility",
      ok: false,
      status: "error",
      summary: "Runtime configuration contains errors."
    };
  }

  return {
    category: "runtime",
    detail: runtimeConfig.version || "configured",
    fix: null,
    name: "Runtime compatibility",
    ok: true,
    status: "ok",
    summary: "Runtime configuration is compatible with the installer."
  };
}

export default async function validateInstallationEnvironment(options = {}) {
  const projectDir = path.resolve(options.projectDir || process.cwd());
  const outputDir = path.resolve(projectDir, options.outputDir || "dist");
  const checks = options.checks || {};

  const results = [];

  results.push(await (checks.node || checkNodeVersion)(options.node || {}));
  results.push(await (checks.php || checkPhpVersion)(options.php || {}));
  results.push(await (checks.output || checkWritableDirectory)(outputDir, "Output directory", {
    category: "filesystem",
    fix: "Create the output directory or grant write permission before installation continues."
  }));
  results.push(validateSsl(options.domain));
  results.push(validateRuntimeCompatibility(options.runtimeConfig));

  const summary = summarizeValidationResults(results);

  return {
    diagnostics: {
      errors: results.filter((result) => result.status === "error").map(toDiagnostic),
      warnings: results.filter((result) => result.status === "warning").map(toDiagnostic)
    },
    ok: summary.error === 0,
    results: results.map(toDiagnostic),
    summary,
    version: INSTALLATION_ENVIRONMENT_VERSION
  };
}
