import assert from "node:assert/strict";
import test from "node:test";
import createInstallationConfigGenerator from "../src/installer/createInstallationConfigGenerator.js";
import createInstallationReport, {
  INSTALLATION_REPORT_VERSION
} from "../src/installer/createInstallationReport.js";
import createInstallationSession from "../src/installer/createInstallationSession.js";

function createFinishedSession() {
  const session = createInstallationSession({
    id: "install-report",
    input: {
      projectDir: "/tmp/site"
    }
  });

  session.transition("CHECK");
  session.transition("CONFIGURE");
  session.transition("VALIDATE");
  session.transition("BUILD");
  return session.finish({
    build: {
      durationMs: 42,
      outputDir: "/tmp/site/dist",
      pages: 12
    }
  });
}

test("createInstallationReport renders summary and project sections", () => {
  const configuration = createInstallationConfigGenerator({
    domain: "https://store.example.com",
    outputDir: "dist",
    projectDir: "/tmp/site",
    siteName: "Example Store",
    wordpressUrl: "https://api.example.com"
  });
  const report = createInstallationReport({
    configuration,
    environment: {
      diagnostics: {
        errors: [],
        warnings: []
      },
      summary: {
        error: 0,
        ok: 5,
        total: 5,
        warning: 0
      }
    },
    generatedAt: "2026-07-23T00:00:00.000Z",
    session: createFinishedSession()
  });

  assert.match(report, /# WPSC Installation Report/);
  assert.match(report, new RegExp(`Report Version: ${INSTALLATION_REPORT_VERSION}`));
  assert.match(report, /Generated: 2026-07-23T00:00:00.000Z/);
  assert.match(report, /Example Store/);
  assert.match(report, /https:\/\/store.example.com/);
  assert.match(report, /\/tmp\/site\/dist/);
  assert.match(report, /\| Pages \| 12 \|/);
});

test("createInstallationReport includes generated files and diagnostics", () => {
  const configuration = createInstallationConfigGenerator({
    projectDir: "/tmp/site"
  });
  const session = createInstallationSession({
    id: "install-warning"
  });
  session.addWarning("install.demo.warning", "Demo warning.", {
    source: "test"
  });

  const report = createInstallationReport({
    configuration,
    environment: {
      diagnostics: {
        errors: [
          {
            code: "install.environment.output",
            fix: "Fix output.",
            message: "Output is not writable."
          }
        ],
        warnings: []
      },
      summary: {
        error: 1,
        ok: 4,
        total: 5,
        warning: 0
      }
    },
    session: session.getState()
  });

  assert.match(report, /- \.env/);
  assert.match(report, /install.config.wordpress.placeholder/);
  assert.match(report, /install.demo.warning/);
  assert.match(report, /install.environment.output/);
  assert.match(report, /\| Status \| error \|/);
});
