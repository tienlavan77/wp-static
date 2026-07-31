import { randomUUID } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import deepFreeze from "../shared/deepFreeze.js";

export const PRODUCT_SUPPORT_BUNDLE_SCHEMA = "wpsc.product-support-bundle";
export const PRODUCT_SUPPORT_BUNDLE_VERSION = 1;

export default function createProductSupportBundleService(options = {}) {
  const repository = options.repository;
  const registry = options.registry;
  const security = options.security;
  if (!repository?.workspaceDir || !registry?.listSites || !security?.publicProjection) throw new TypeError("Product Support Bundle requires Site Repository, Site Registry and Secrets Boundary.");
  const product = options.product ?? {};
  const runtime = options.runtime ?? null;
  const health = options.health ?? null;
  const deployment = options.deployment ?? null;
  const observability = options.observability ?? null;
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();

  async function create(input = {}) {
    const bundleId = safeId(input.bundleId ?? randomUUID());
    const root = path.join(repository.workspaceDir, "storage", "support-bundles", bundleId);
    const sites = await registry.listSites();
    const siteIds = sites.map((site) => site.siteId ?? site.id);
    const [healthSummary, deploymentSummary, errorLogs] = await Promise.all([
      Promise.all(siteIds.map(async (siteId) => ({ siteId, value: health?.inspect ? await health.inspect(siteId) : null }))),
      Promise.all(siteIds.map(async (siteId) => ({ siteId, value: deployment?.status ? await deployment.status(siteId) : null }))),
      Promise.all(siteIds.map(async (siteId) => observability?.listLogs ? (await observability.listLogs(siteId)).filter((entry) => entry.level === "error") : []))
    ]);
    const diagnostics = collectDiagnostics([...healthSummary.map((entry) => entry.value), ...deploymentSummary.map((entry) => entry.value)]);
    const files = {
      "product.json": product,
      "runtime.json": runtime?.state?.() ?? null,
      "health.json": healthSummary,
      "site-summary.json": sites,
      "deployment-summary.json": deploymentSummary,
      "diagnostics.json": diagnostics
    };
    await mkdir(root, { recursive: true });
    for (const [name, value] of Object.entries(files)) await writeJson(path.join(root, name), security.publicProjection(value));
    const errors = errorLogs.flat().map((entry) => JSON.stringify(security.publicProjection(entry))).join("\n");
    await writeFile(path.join(root, "recent-errors.ndjson"), errors ? `${errors}\n` : "", "utf8");
    const manifest = security.publicProjection({ bundleId, createdAt: now(), files: [...Object.keys(files), "recent-errors.ndjson"], schema: PRODUCT_SUPPORT_BUNDLE_SCHEMA, schemaVersion: PRODUCT_SUPPORT_BUNDLE_VERSION });
    await writeJson(path.join(root, "bundle.json"), manifest);
    return deepFreeze({ diagnostics: { errors: [], warnings: [] }, manifest, ok: true, path: root });
  }
  return Object.freeze({ create });
}

function collectDiagnostics(results) { const errors = []; const warnings = []; for (const result of results) { errors.push(...(result?.diagnostics?.errors ?? [])); warnings.push(...(result?.diagnostics?.warnings ?? [])); } return { errors, warnings }; }
async function writeJson(target, value) { const temporary = `${target}.tmp`; await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temporary, target); }
function safeId(value) { const id = String(value ?? ""); if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id)) throw new TypeError("Support Bundle id is invalid."); return id; }
