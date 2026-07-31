export const INSTALLATION_REPORT_VERSION = "1.0";

function table(rows = []) {
  return [
    "| Field | Value |",
    "| --- | --- |",
    ...rows.map(([field, value]) => `| ${field} | ${formatValue(value)} |`)
  ].join("\n");
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "n/a";
  }

  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }

  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function formatDiagnostics(title, diagnostics = []) {
  if (diagnostics.length === 0) {
    return `## ${title}\n\nNone.\n`;
  }

  return `## ${title}\n\n${diagnostics
    .map((diagnostic) => `- **${diagnostic.code || diagnostic.name}**: ${diagnostic.message || diagnostic.summary}${diagnostic.fix ? ` Fix: ${diagnostic.fix}` : ""}`)
    .join("\n")}\n`;
}

function formatFiles(files = []) {
  if (files.length === 0) {
    return "No generated files.";
  }

  return files.map((file) => `- ${file.path || file}`).join("\n");
}

export default function createInstallationReport(details = {}) {
  const session = details.session || {};
  const config = details.configuration || {};
  const environment = details.environment || {};
  const build = session.result?.build || details.build || {};
  const warnings = [
    ...(environment.diagnostics?.warnings || []),
    ...(config.diagnostics?.warnings || []),
    ...(session.diagnostics?.warnings || [])
  ];
  const errors = [
    ...(environment.diagnostics?.errors || []),
    ...(config.diagnostics?.errors || []),
    ...(session.diagnostics?.errors || [])
  ];

  return `# WPSC Installation Report

Generated: ${details.generatedAt || new Date().toISOString()}
Report Version: ${INSTALLATION_REPORT_VERSION}

## Summary

${table([
  ["Status", errors.length === 0 ? "ok" : "error"],
  ["Session", session.id],
  ["Step", session.step],
  ["Warnings", warnings.length],
  ["Errors", errors.length]
])}

## Project

${table([
  ["Site Name", config.options?.siteName || config.config?.project?.name],
  ["Domain", config.options?.domain || config.config?.project?.site?.url],
  ["WordPress URL", config.options?.wordpressUrl],
  ["WooCommerce URL", config.options?.woocommerceUrl],
  ["Output Directory", config.options?.outputDir || build.outputDir],
  ["Theme", config.options?.theme]
])}

## Environment

${table([
  ["OK", environment.summary?.ok],
  ["Warnings", environment.summary?.warning],
  ["Errors", environment.summary?.error],
  ["Total Checks", environment.summary?.total]
])}

## Runtime

${table([
  ["Runtime Mode", config.config?.runtime?.mode],
  ["Runtime Version", config.config?.runtime?.version],
  ["Runtime Output", config.config?.runtime?.paths?.outputDir]
])}

## Build

${table([
  ["Output Directory", build.outputDir],
  ["Pages", build.pages],
  ["Duration", build.durationMs ? `${build.durationMs}ms` : null]
])}

## Generated Files

${formatFiles(config.files)}

${formatDiagnostics("Warnings", warnings)}
${formatDiagnostics("Errors", errors)}
## Next Steps

1. Review generated configuration values.
2. Resolve all errors before exposing the site publicly.
3. Keep this report for support and diagnostics.
`;
}
