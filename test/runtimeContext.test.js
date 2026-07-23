import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import createRuntimeContext, {
  createRuntimeEnvironment,
  createRuntimePaths,
  RUNTIME_CONTEXT_VERSION
} from "../src/runtime/createRuntimeContext.js";

test("createRuntimeEnvironment normalizes mode and booleans", () => {
  const environment = createRuntimeEnvironment({
    variables: {
      CI: "true",
      NODE_ENV: "production"
    }
  });

  assert.equal(environment.mode, "production");
  assert.equal(environment.nodeEnv, "production");
  assert.equal(environment.isProduction, true);
  assert.equal(environment.isDevelopment, false);
  assert.equal(environment.ci, true);
});

test("createRuntimePaths resolves project-relative paths", () => {
  const paths = createRuntimePaths({
    projectDir: "/tmp/wpsc-site",
    outputDir: "public",
    cacheDir: ".cache/wpsc"
  });

  assert.equal(paths.projectDir, "/tmp/wpsc-site");
  assert.equal(paths.outputDir, "/tmp/wpsc-site/public");
  assert.equal(paths.cacheDir, "/tmp/wpsc-site/.cache/wpsc");
  assert.equal(paths.configPath, "/tmp/wpsc-site/wpsc.config.js");
  assert.equal(paths.runtimeConfigPath, "/tmp/wpsc-site/runtime.config.js");
});

test("createRuntimeContext creates a shared execution context", () => {
  const logger = {
    error() {},
    info() {},
    verbose() {}
  };
  const services = {
    auth: {
      name: "auth-service"
    }
  };
  const cache = {
    pages: new Map()
  };
  const context = createRuntimeContext({
    cache,
    config: {
      outputDir: "dist"
    },
    environment: {
      mode: "development",
      variables: {
        NODE_ENV: "development"
      }
    },
    logger,
    projectDir: "/tmp/wpsc-site",
    services
  });

  assert.equal(context.version, RUNTIME_CONTEXT_VERSION);
  assert.equal(context.paths.outputDir, path.resolve("/tmp/wpsc-site/dist"));
  assert.equal(context.environment.isDevelopment, true);
  assert.equal(context.logger, logger);
  assert.equal(context.services.resolve("auth"), services.auth);
  assert.equal(context.cache, cache);
  assert.deepEqual(context.diagnostics.errors, []);
  assert.deepEqual(context.diagnostics.warnings, []);
});
