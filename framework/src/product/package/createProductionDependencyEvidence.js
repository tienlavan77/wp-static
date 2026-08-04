import deepFreeze from "../../shared/deepFreeze.js";

export default function createProductionDependencyEvidence(input = {}) {
  const modules = input.modules ?? {};
  const features = Object.fromEntries(Object.entries(input.features ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([feature, definition]) => {
    const visited = new Set();
    const runtimeDependencies = new Set();
    const dynamicDependencies = new Set();
    const assets = new Set(definition.assets ?? []);
    const templates = new Set(definition.templates ?? []);
    const plugins = new Set(definition.plugins ?? []);
    const queue = [...(definition.entrypoints ?? [])];
    while (queue.length > 0) {
      const modulePath = safePath(queue.shift());
      if (visited.has(modulePath)) continue;
      const module = modules[modulePath];
      if (!module) throw new TypeError(`Production dependency evidence is missing module: ${modulePath}.`);
      visited.add(modulePath);
      for (const dependency of module.imports ?? []) { runtimeDependencies.add(safePath(dependency)); queue.push(dependency); }
      for (const dependency of module.dynamicImports ?? []) { dynamicDependencies.add(safePath(dependency)); queue.push(dependency); }
      for (const value of module.assets ?? []) assets.add(safePath(value));
      for (const value of module.templates ?? []) templates.add(safePath(value));
      for (const value of module.plugins ?? []) plugins.add(safePath(value));
    }
    return [feature, deepFreeze({ assets: sorted(assets), dynamicDependencies: sorted(dynamicDependencies), entrypoints: sorted(new Set(definition.entrypoints?.map(safePath) ?? [])), modules: sorted(visited), plugins: sorted(plugins), runtimeDependencies: sorted(runtimeDependencies), templates: sorted(templates) })];
  }));
  return deepFreeze({ features: deepFreeze(features), schema: "wpsc.production-dependencies", schemaVersion: 1 });
}

export function dependencyEvidenceFiles(evidence) {
  const files = new Set();
  for (const feature of Object.values(evidence.features ?? {})) for (const group of ["modules", "assets", "templates", "plugins"]) for (const file of feature[group] ?? []) files.add(safePath(file));
  return sorted(files);
}

function safePath(value) { const result = String(value ?? "").replaceAll("\\", "/"); if (!result || result.startsWith("/") || result.split("/").includes("..")) throw new TypeError(`Production dependency path is unsafe: ${value}.`); return result; }
function sorted(values) { return [...values].sort((a, b) => a.localeCompare(b)); }
