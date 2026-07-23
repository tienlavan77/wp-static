import { summarizeValidationResults } from "./createValidationResult.js";

const STATUS_LABELS = {
  error: "ERROR",
  ok: "OK",
  warning: "WARNING"
};

export function formatValidationResults(results = [], options = {}) {
  if (options.format === "json") {
    return JSON.stringify({
      results,
      summary: summarizeValidationResults(results)
    }, null, 2);
  }

  const groups = groupByCategory(results);
  const lines = [];

  for (const [category, checks] of groups.entries()) {
    lines.push(formatCategory(category));

    for (const check of checks) {
      lines.push(formatCheck(check));

      if (check.fix) {
        lines.push(`    Fix: ${check.fix}`);
      }
    }

    lines.push("");
  }

  const summary = summarizeValidationResults(results);
  lines.push(`Summary: ${summary.ok} OK, ${summary.warning} warning, ${summary.error} error`);

  return lines.join("\n").trimEnd();
}

export function groupByCategory(results = []) {
  const groups = new Map();

  for (const result of results) {
    const category = result.category || "general";

    if (!groups.has(category)) {
      groups.set(category, []);
    }

    groups.get(category).push(result);
  }

  return groups;
}

function formatCategory(category) {
  return `${titleCase(category)}:`;
}

function formatCheck(check) {
  const status = STATUS_LABELS[check.status] || STATUS_LABELS.ok;
  const summary = check.summary || check.detail || "";

  return `  [${status}] ${check.name}: ${summary}`;
}

function titleCase(value) {
  return String(value || "general")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
