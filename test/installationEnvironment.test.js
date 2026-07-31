import assert from "node:assert/strict";
import test from "node:test";
import validateInstallationEnvironment, {
  INSTALLATION_ENVIRONMENT_VERSION
} from "../framework/src/installer/validateInstallationEnvironment.js";

function ok(name, detail, category = "environment") {
  return {
    category,
    detail,
    fix: null,
    name,
    ok: true,
    status: "ok",
    summary: `${name} ok.`
  };
}

function warning(name, detail, category = "environment") {
  return {
    category,
    detail,
    fix: "Fix warning.",
    name,
    ok: true,
    status: "warning",
    summary: `${name} warning.`
  };
}

function error(name, detail, category = "environment") {
  return {
    category,
    detail,
    fix: "Fix error.",
    name,
    ok: false,
    status: "error",
    summary: `${name} error.`
  };
}

test("validateInstallationEnvironment reports a healthy environment", async () => {
  const report = await validateInstallationEnvironment({
    checks: {
      node: async () => ok("Node.js >= 20", "v26.0.0"),
      output: async () => ok("Output directory", "/tmp/site/dist", "filesystem"),
      php: async () => ok("PHP >= 8", "8.3.0")
    },
    domain: "https://example.com",
    projectDir: "/tmp/site",
    runtimeConfig: {
      ok: true,
      version: "1.0"
    }
  });

  assert.equal(report.version, INSTALLATION_ENVIRONMENT_VERSION);
  assert.equal(report.ok, true);
  assert.deepEqual(report.summary, {
    error: 0,
    ok: 5,
    total: 5,
    warning: 0
  });
  assert.deepEqual(report.diagnostics.errors, []);
  assert.deepEqual(report.diagnostics.warnings, []);
});

test("validateInstallationEnvironment returns structured errors and warnings", async () => {
  const report = await validateInstallationEnvironment({
    checks: {
      node: async () => ok("Node.js >= 20", "v26.0.0"),
      output: async () => error("Output directory", "/tmp/site/dist", "filesystem"),
      php: async () => warning("PHP >= 8", "missing")
    },
    domain: "http://example.com",
    projectDir: "/tmp/site",
    runtimeConfig: {
      ok: false
    }
  });

  assert.equal(report.ok, false);
  assert.deepEqual(report.summary, {
    error: 2,
    ok: 1,
    total: 5,
    warning: 2
  });
  assert.deepEqual(
    report.diagnostics.errors.map((diagnostic) => diagnostic.code),
    [
      "install.environment.filesystem.output.directory",
      "install.environment.runtime.runtime.compatibility"
    ]
  );
  assert.deepEqual(
    report.diagnostics.warnings.map((diagnostic) => diagnostic.category),
    ["environment", "ssl"]
  );
});

test("validateInstallationEnvironment validates missing and invalid domains", async () => {
  const checks = {
    node: async () => ok("Node.js >= 20", "v26.0.0"),
    output: async () => ok("Output directory", "/tmp/site/dist", "filesystem"),
    php: async () => ok("PHP >= 8", "8.3.0")
  };
  const missingDomain = await validateInstallationEnvironment({
    checks,
    projectDir: "/tmp/site"
  });
  const invalidDomain = await validateInstallationEnvironment({
    checks,
    domain: "not a domain",
    projectDir: "/tmp/site"
  });

  assert.equal(missingDomain.ok, true);
  assert.equal(
    missingDomain.diagnostics.warnings.find((diagnostic) => diagnostic.category === "ssl").code,
    "install.environment.ssl.ssl"
  );
  assert.equal(invalidDomain.ok, false);
  assert.equal(invalidDomain.diagnostics.errors.at(-1).code, "install.environment.ssl.ssl");
});
