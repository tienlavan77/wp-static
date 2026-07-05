import path from "node:path";

const DEFAULT_EXCLUDES = [
  ".DS_Store",
  ".wpsc/cache"
];

export default function createRsyncDeployPlan(options = {}) {
  const sourceDir = normalizeDirectory(options.sourceDir, "sourceDir");
  const target = normalizeTarget(options.target);
  const excludes = [...DEFAULT_EXCLUDES, ...(options.excludes ?? [])];
  const args = [
    "-avz",
    "--delete",
    ...excludes.flatMap((exclude) => ["--exclude", exclude]),
    ensureTrailingSlash(sourceDir),
    target
  ];

  if (options.dryRun) {
    args.unshift("--dry-run");
  }

  return {
    args,
    command: "rsync",
    sourceDir,
    target
  };
}

function normalizeDirectory(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`Rsync deploy requires ${fieldName}.`);
  }

  return path.resolve(value);
}

function normalizeTarget(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("Rsync deploy requires target.");
  }

  return value.trim();
}

function ensureTrailingSlash(value) {
  return value.endsWith(path.sep) ? value : `${value}${path.sep}`;
}
