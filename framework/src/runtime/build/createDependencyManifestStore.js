import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const DEPENDENCY_MANIFEST_SCHEMA = "wpsc.route-dependencies";
export const DEPENDENCY_MANIFEST_VERSION = 1;

function routeDependencies(dependencies = {}) {
  const keys = new Set();
  const addContent = (type, id, slug) => {
    if (type && id != null) keys.add(`${type}:${id}`);
    if (type && slug) keys.add(`${type}:${slug}`);
  };
  const addTerm = (term) => {
    if (!term?.taxonomy) return;
    if (term.id != null) keys.add(`term:${term.taxonomy}:${term.id}`);
    if (term.slug) keys.add(`term:${term.taxonomy}:${term.slug}`);
  };

  addContent(dependencies.content?.type, dependencies.content?.id, dependencies.content?.slug);
  addContent("product", dependencies.content?.parentId, dependencies.content?.parentSlug);
  for (const term of dependencies.terms || []) addTerm(term);
  for (const item of dependencies.archiveItems || []) addContent(item.type, item.id, item.slug);
  for (const product of dependencies.productReferences || []) addContent("product", product.id, product.slug);
  return [...keys].sort();
}

export function createDependencyManifest(input = {}) {
  const dependenciesByRoute = input.dependenciesByRoute;
  if (!input.siteId || !input.buildId || !dependenciesByRoute || typeof dependenciesByRoute !== "object") {
    throw new TypeError("Dependency Manifest requires siteId, buildId, and route dependencies.");
  }
  const contentToRoutes = {};
  const routeToDependencies = {};
  for (const [route, dependencies] of Object.entries(dependenciesByRoute)) {
    const keys = routeDependencies(dependencies);
    routeToDependencies[route] = keys;
    for (const key of keys) (contentToRoutes[key] ||= []).push(route);
  }
  for (const routes of Object.values(contentToRoutes)) routes.sort();
  return {
    buildId: String(input.buildId),
    contentToRoutes,
    routeToDependencies,
    schema: DEPENDENCY_MANIFEST_SCHEMA,
    schemaVersion: DEPENDENCY_MANIFEST_VERSION,
    siteId: String(input.siteId)
  };
}

export function isDependencyManifest(value, siteId) {
  return Boolean(value
    && value.schema === DEPENDENCY_MANIFEST_SCHEMA
    && value.schemaVersion === DEPENDENCY_MANIFEST_VERSION
    && value.siteId === String(siteId)
    && typeof value.buildId === "string"
    && value.buildId
    && isRouteMap(value.contentToRoutes)
    && isRouteMap(value.routeToDependencies));
}

function isRouteMap(value) {
  return Boolean(value
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.values(value).every((entries) => Array.isArray(entries)
      && entries.every((entry) => typeof entry === "string" && entry)));
}

export default function createDependencyManifestStore(options = {}) {
  const repository = options.repository;
  if (!repository?.resolveSiteRoot) throw new TypeError("Dependency Manifest Store requires a Site Repository.");
  const filePath = (siteId) => path.join(repository.resolveSiteRoot(siteId), "storage", "build", "dependency-manifest.json");

  return Object.freeze({
    async load(siteId) {
      try {
        const manifest = JSON.parse(await readFile(filePath(siteId), "utf8"));
        return isDependencyManifest(manifest, siteId) ? manifest : null;
      } catch { return null; }
    },
    async save(input = {}) {
      const manifest = createDependencyManifest(input);
      const target = filePath(manifest.siteId);
      await mkdir(path.dirname(target), { recursive: true });
      const temporary = `${target}.${manifest.buildId}.tmp`;
      await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
      await rename(temporary, target);
      return { manifest, path: target };
    }
  });
}
