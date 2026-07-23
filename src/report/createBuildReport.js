export default function createBuildReport(details = {}) {
  const builtAt = details.builtAt ?? new Date().toISOString();
  const buildResult = details.result ?? {};
  const sitePlan = details.sitePlan ?? {};
  const pipeline = details.pipeline ?? null;
  const warnings = details.warnings ?? [];
  const errors = details.errors ?? [];

  return `# WPSC Build Report

Generated: ${builtAt}

## Project

| Field | Value |
| --- | --- |
| Name | ${details.config?.name ?? "Unknown"} |
| Output Directory | ${buildResult.outputDir ?? "Unknown"} |
| Full Build | ${formatBoolean(buildResult.fullBuild !== false)} |
| Changed Routes | ${formatList(buildResult.changedRoutes)} |

## Build Summary

| Metric | Value |
| --- | --- |
| Pages Written | ${formatNumber(buildResult.pagesWritten)} |
| Total Pages | ${formatNumber(buildResult.totalPages ?? sitePlan.pages?.length)} |
| Route Data Written | ${formatNumber(buildResult.routeData?.routesWritten)} |
| Fragments Written | ${formatNumber(buildResult.fragmentOutputs?.fragmentsWritten)} |
| Search Index Items | ${formatNumber(buildResult.searchIndex?.itemsWritten)} |
| Content Files Written | ${formatNumber(buildResult.contentStore?.filesWritten)} |

## Assets

| Metric | Value |
| --- | --- |
| Public Assets Copied | ${formatBoolean(buildResult.copiedPublicAssets)} |
| Theme Assets Copied | ${formatBoolean(buildResult.copiedThemeAssets)} |
| Remote Assets Downloaded | ${formatNumber(buildResult.assetsDownloaded)} |
| Asset Total | ${formatNumber(buildResult.assetStats?.total)} |
| Asset Cached | ${formatNumber(buildResult.assetStats?.cached)} |
| Asset Downloaded | ${formatNumber(buildResult.assetStats?.downloaded)} |

## Runtime

| Field | Value |
| --- | --- |
| Runtime Assets | ${buildResult.runtimeAssetsCopied === false ? "No" : "Yes"} |
| Admin App | ${buildResult.adminApp?.outputPath ?? "Not generated"} |

## Plugins

${formatPlugins(sitePlan.plugins)}

## Pipeline

${formatPipeline(pipeline)}

## Warnings

${formatMessages(warnings, "No warnings.")}

## Errors

${formatMessages(errors, "No errors.")}
`;
}

function formatPlugins(plugins = []) {
  if (!Array.isArray(plugins) || plugins.length === 0) {
    return "No plugins.";
  }

  return plugins.map((plugin) => `- ${plugin.name ?? "Unnamed plugin"}`).join("\n");
}

function formatPipeline(pipeline) {
  if (!pipeline?.stages?.length) {
    return "No pipeline data.";
  }

  const rows = pipeline.stages.map((stage) => (
    `| ${stage.label ?? stage.name} | ${stage.ok ? "OK" : "Error"} | ${formatDuration(stage.durationMs)} |`
  ));

  return [
    "| Stage | Status | Duration |",
    "| --- | --- | --- |",
    ...rows,
    "",
    `Total Duration: ${formatDuration(pipeline.durationMs)}`
  ].join("\n");
}

function formatMessages(messages = [], fallback) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return fallback;
  }

  return messages.map((message) => {
    if (typeof message === "string") {
      return `- ${message}`;
    }

    const summary = message.summary ?? message.message ?? "Build message";
    const fix = message.fix ? ` Fix: ${message.fix}` : "";

    return `- ${summary}.${fix}`;
  }).join("\n");
}

function formatList(values = []) {
  if (!Array.isArray(values) || values.length === 0) {
    return "None";
  }

  return values.join(", ");
}

function formatNumber(value) {
  if (Number.isFinite(value)) {
    return String(value);
  }

  return "0";
}

function formatBoolean(value) {
  return value ? "Yes" : "No";
}

function formatDuration(value) {
  if (!Number.isFinite(value)) {
    return "0ms";
  }

  if (value < 1000) {
    return `${Math.max(0, Math.round(value))}ms`;
  }

  return `${(value / 1000).toFixed(2)}s`;
}
