export const RUNTIME_DIAGNOSTICS_VERSION = "1.0";

function normalizeDiagnostics(diagnostics = {}) {
  return {
    errors: [...(diagnostics.errors || [])],
    warnings: [...(diagnostics.warnings || [])]
  };
}

function createSummary(namespaces) {
  const errors = Object.values(namespaces).reduce(
    (total, namespace) => total + (namespace.errors?.length || 0),
    0
  );
  const warnings = Object.values(namespaces).reduce(
    (total, namespace) => total + (namespace.warnings?.length || 0),
    0
  );

  return {
    errors,
    ok: errors === 0,
    warnings
  };
}

function collectContext(context) {
  const diagnostics = normalizeDiagnostics(context?.diagnostics);

  return {
    ...diagnostics,
    environment: context?.environment
      ? {
          ci: context.environment.ci,
          mode: context.environment.mode,
          nodeEnv: context.environment.nodeEnv
        }
      : null,
    paths: context?.paths || null,
    runtimeVersion: context?.version || null
  };
}

function collectServices(services) {
  const serviceList = services?.list ? services.list() : [];

  return {
    errors: [],
    metrics: {
      registered: serviceList.length,
      singleton: serviceList.filter((service) => service.lifecycle === "singleton").length,
      transient: serviceList.filter((service) => service.lifecycle === "transient").length,
      value: serviceList.filter((service) => service.lifecycle === "value").length
    },
    services: serviceList,
    warnings: []
  };
}

function collectHooks(hooks) {
  const hookList = hooks?.list ? hooks.list() : [];

  return {
    errors: [],
    hooks: hookList,
    metrics: {
      registered: hookList.length,
      sources: [...new Set(hookList.map((hook) => hook.source))].sort()
    },
    warnings: []
  };
}

function collectExtensions(extensions) {
  const extensionList = extensions?.list ? extensions.list() : [];

  return {
    errors: [],
    extensions: extensionList,
    metrics: {
      loaded: extensionList.filter((extension) => extension.loaded).length,
      registered: extensionList.length
    },
    warnings: []
  };
}

function collectConfig(runtimeConfig) {
  const diagnostics = normalizeDiagnostics(runtimeConfig?.diagnostics);

  return {
    ...diagnostics,
    mode: runtimeConfig?.config?.mode || null,
    paths: runtimeConfig?.config?.paths || null,
    runtimeConfigVersion: runtimeConfig?.version || null
  };
}

export default function createRuntimeDiagnostics(options = {}) {
  const namespaces = {
    config: collectConfig(options.runtimeConfig),
    extensions: collectExtensions(options.extensions),
    hooks: collectHooks(options.hooks),
    runtime: collectContext(options.context),
    services: collectServices(options.services || options.context?.services)
  };

  return {
    generatedAt: options.generatedAt || null,
    namespaces,
    summary: createSummary(namespaces),
    version: RUNTIME_DIAGNOSTICS_VERSION
  };
}
