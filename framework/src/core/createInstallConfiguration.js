import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createOk,
  createWarning,
  summarizeValidationResults
} from "../validation/createValidationResult.js";

const DEFAULTS = {
  domain: "http://localhost:8080",
  outputDir: "./dist",
  siteName: "WPSC Site",
  theme: "commerce",
  wordpressUrl: "https://example.com"
};

export default async function createInstallConfiguration(projectDir, options = {}) {
  const absoluteProjectDir = path.resolve(projectDir);
  const installOptions = normalizeInstallOptions(options);
  const files = createInstallFiles(installOptions);
  const generatedFiles = [];
  const results = [];

  await mkdir(absoluteProjectDir, { recursive: true });

  for (const file of files) {
    const absolutePath = path.join(absoluteProjectDir, file.path);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.contents, {
      encoding: "utf8",
      flag: installOptions.force ? "w" : "wx"
    });

    generatedFiles.push(absolutePath);
    results.push(createOk(`Generated ${file.path}`, absolutePath, {
      category: "install",
      summary: `${file.path} was generated.`
    }));
  }

  if (installOptions.usesDefaultWordPressUrl) {
    results.push(createWarning("WordPress URL", installOptions.wordpressUrl, {
      category: "install",
      fix: "Run wpsc install with --wordpress-url or edit WPSC_WP_URL in .env.",
      summary: "The install wizard used a placeholder WordPress URL."
    }));
  }

  if (installOptions.usesDefaultDomain) {
    results.push(createWarning("Domain URL", installOptions.domain, {
      category: "install",
      fix: "Run wpsc install with --domain or edit WPSC_SITE_URL in .env.",
      summary: "The install wizard used a local development domain."
    }));
  }

  const reportPath = path.join(absoluteProjectDir, installOptions.reportPath);
  const report = createInstallReport({
    files: generatedFiles,
    options: installOptions,
    projectDir: absoluteProjectDir,
    results
  });

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, report, {
    encoding: "utf8",
    flag: installOptions.force ? "w" : "wx"
  });

  generatedFiles.push(reportPath);
  results.push(createOk(`Generated ${installOptions.reportPath}`, reportPath, {
    category: "install",
    summary: `${installOptions.reportPath} was generated.`
  }));

  return {
    files: generatedFiles,
    options: installOptions,
    projectDir: absoluteProjectDir,
    reportPath,
    results,
    summary: summarizeValidationResults(results)
  };
}

function normalizeInstallOptions(options = {}) {
  const wordpressUrl = normalizeUrl(options.wordpressUrl, DEFAULTS.wordpressUrl, "wordpressUrl");
  const domain = normalizeUrl(options.domain, DEFAULTS.domain, "domain");

  return {
    domain,
    force: Boolean(options.force),
    outputDir: normalizeOutputDir(options.outputDir),
    reportPath: normalizeRelativePath(options.reportPath, "install-report.md", "reportPath"),
    siteName: normalizeText(options.siteName, DEFAULTS.siteName),
    theme: normalizeText(options.theme, DEFAULTS.theme),
    usesDefaultDomain: !options.domain,
    usesDefaultWordPressUrl: !options.wordpressUrl,
    woocommerceUrl: normalizeUrl(options.woocommerceUrl, wordpressUrl, "woocommerceUrl"),
    wordpressUrl
  };
}

function createInstallFiles(options) {
  return [
    {
      path: ".env",
      contents: createEnvFile(options)
    },
    {
      path: "wpsc.config.js",
      contents: createProjectConfigFile(options)
    },
    {
      path: "runtime.config.js",
      contents: createRuntimeConfigFile(options)
    },
    {
      path: "theme/layout.js",
      contents: createThemeLayoutFile()
    },
    {
      path: "theme/components/index.js",
      contents: "export default {};\n"
    },
    {
      path: "theme/assets/.gitkeep",
      contents: ""
    },
    {
      path: "public/.gitkeep",
      contents: ""
    }
  ];
}

function createInstallReport(details) {
  const warnings = details.results.filter((result) => result.status === "warning");
  const errors = details.results.filter((result) => result.status === "error");

  return `# WPSC Installation Report

Generated: ${new Date().toISOString()}

## Project

| Field | Value |
| --- | --- |
| Project Directory | ${details.projectDir} |
| Site Name | ${details.options.siteName} |
| Site URL | ${details.options.domain} |
| WordPress URL | ${details.options.wordpressUrl} |
| WooCommerce URL | ${details.options.woocommerceUrl} |
| Output Directory | ${details.options.outputDir} |
| Theme | ${details.options.theme} |

## Environment

| Check | Value |
| --- | --- |
| Node.js | ${process.version} |
| Platform | ${process.platform} |
| Architecture | ${process.arch} |

## Generated Files

${details.files.map((file) => `- ${file}`).join("\n")}

## Warnings

${formatReportResults(warnings, "No warnings.")}

## Errors

${formatReportResults(errors, "No errors.")}

## Next Steps

1. Review \`.env\` and replace any \`change-me\` values.
2. Run \`wpsc validate --project ${details.projectDir}\`.
3. Run \`wpsc build --project ${details.projectDir}\` after validation passes.
`;
}

function createEnvFile(options) {
  return `# Generated by wpsc install.
WPSC_SITE_URL=${options.domain}
WPSC_WP_URL=${options.wordpressUrl}
WPSC_WOO_URL=${options.woocommerceUrl}
WPSC_WOO_CONSUMER_KEY=change-me
WPSC_WOO_CONSUMER_SECRET=change-me
WPSC_RUNTIME_PORT=8787
WPSC_SESSION_SECRET=change-me
WPSC_AUTH_BRIDGE_SECRET=change-me
WPSC_AUTH_ENDPOINT=/wp-json/wpsc/v1/auth/login
`;
}

function createProjectConfigFile(options) {
  return `const wordpressUrl = process.env.WPSC_WP_URL ?? ${quote(options.wordpressUrl)};
const woocommerceUrl = process.env.WPSC_WOO_URL ?? wordpressUrl;
const siteUrl = process.env.WPSC_SITE_URL ?? ${quote(options.domain)};

export default {
  name: ${quote(options.siteName)},
  homepage: "home",
  outputDir: ${quote(options.outputDir)},
  adapter: {
    type: "wordpressWooCommerce",
    wordpress: {
      baseUrl: wordpressUrl
    },
    woocommerce: {
      baseUrl: woocommerceUrl,
      consumerKey: process.env.WPSC_WOO_CONSUMER_KEY,
      consumerSecret: process.env.WPSC_WOO_CONSUMER_SECRET
    }
  },
  theme: {
    name: ${quote(options.theme)},
    layout: "./theme/layout.js",
    components: "./theme/components/index.js",
    assets: "./theme/assets"
  },
  site: {
    url: siteUrl
  }
};
`;
}

function createRuntimeConfigFile(options) {
  return `const wordpressUrl = process.env.WPSC_WP_URL ?? ${quote(options.wordpressUrl)};

export default {
  runtime: {
    port: Number(process.env.WPSC_RUNTIME_PORT ?? 8787),
    wordpressUrl,
    authEndpoint: process.env.WPSC_AUTH_ENDPOINT ?? "/wp-json/wpsc/v1/auth/login",
    session: {
      cookieName: "wpsc_session",
      secret: process.env.WPSC_SESSION_SECRET ?? "change-me",
      secure: process.env.NODE_ENV === "production"
    }
  }
};
`;
}

function createThemeLayoutFile() {
  return `export default function layout(page = {}) {
  const title = page.title ?? "WPSC";
  const body = page.html ?? page.content ?? "";

  return \`<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>\${title}</title>
  </head>
  <body>
    <main data-wpsc-route="\${page.slug ?? ""}">
      <h1>\${title}</h1>
      \${body}
    </main>
  </body>
</html>\`;
}
`;
}

function normalizeOutputDir(value) {
  const outputDir = normalizeText(value, DEFAULTS.outputDir);

  assertRelativePath(outputDir, "outputDir");

  return outputDir;
}

function normalizeRelativePath(value, fallback, optionName) {
  const relativePath = normalizeText(value, fallback);

  assertRelativePath(relativePath, optionName);

  return relativePath;
}

function normalizeText(value, fallback) {
  const text = String(value ?? "").trim();

  return text || fallback;
}

function normalizeUrl(value, fallback, optionName) {
  const text = normalizeText(value, fallback);

  try {
    const url = new URL(text);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Unsupported protocol");
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    throw new Error(`Install option ${optionName} must be a valid http:// or https:// URL.`);
  }
}

function assertRelativePath(value, optionName) {
  if (path.isAbsolute(value)) {
    throw new Error(`Install option ${optionName} must be relative to the project directory.`);
  }

  if (value.split(/[\\/]/).includes("..")) {
    throw new Error(`Install option ${optionName} must stay inside the project directory.`);
  }
}

function formatReportResults(results, fallback) {
  if (results.length === 0) {
    return fallback;
  }

  return results.map((result) => {
    const fix = result.fix ? ` Fix: ${result.fix}` : "";

    return `- ${result.name}: ${result.summary}.${fix}`;
  }).join("\n");
}

function quote(value) {
  return JSON.stringify(value);
}
