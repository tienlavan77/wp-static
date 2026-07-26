import assert from "node:assert/strict";
import test from "node:test";
import createHttpInstaller, {
  HTTP_INSTALLER_VERSION
} from "../src/release/createHttpInstaller.js";

test("createHttpInstaller serves web installer html", async () => {
  const installer = createHttpInstaller();
  const response = await installer.handle({
    method: "GET",
    path: "/install"
  });

  assert.equal(installer.version, HTTP_INSTALLER_VERSION);
  assert.equal(response.status, 200);
  assert.equal(response.headers["content-type"], "text/html; charset=utf-8");
  assert.match(response.body, /data-wpsc-installer/);
});

test("createHttpInstaller exposes start route through Wizard API", async () => {
  const installer = createHttpInstaller();
  const response = await installer.handle({
    body: {
      domain: "https://example.com"
    },
    method: "POST",
    path: "/install/start"
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.state.step, "START");
  assert.equal(response.body.state.input.domain, "https://example.com");
});

test("createHttpInstaller exposes check and config transition routes", async () => {
  const installer = createHttpInstaller();
  const start = await installer.handle({
    body: {},
    method: "POST",
    path: "/install/start"
  });
  const sessionId = start.body.state.id;
  const check = await installer.handle({
    body: {
      sessionId
    },
    method: "POST",
    path: "/install/check"
  });
  const config = await installer.handle({
    body: {
      sessionId
    },
    method: "POST",
    path: "/install/config"
  });

  assert.equal(check.body.ok, true);
  assert.equal(check.body.state.step, "CHECK");
  assert.equal(config.body.ok, true);
  assert.equal(config.body.state.step, "CONFIGURE");
});

test("createHttpInstaller returns report and structured not found responses", async () => {
  const installer = createHttpInstaller({
    report: "# Report"
  });
  const report = await installer.handle({
    method: "GET",
    path: "/install/report"
  });
  const missing = await installer.handle({
    method: "GET",
    path: "/missing"
  });

  assert.equal(report.status, 200);
  assert.equal(report.body.report, "# Report");
  assert.equal(missing.status, 404);
  assert.equal(missing.body.ok, false);
  assert.equal(missing.body.error.code, "http.installer.not_found");
});

test("createHttpInstaller redirects install UI when installation is locked", async () => {
  const installer = createHttpInstaller({
    installationLock: {
      read: async () => ({
        installed: true,
        installedAt: "2026-07-26T00:00:00.000Z",
        lockPath: "/release/config/install.lock"
      })
    }
  });

  const response = await installer.handle({
    method: "GET",
    path: "/install"
  });
  const alreadyInstalled = await installer.handle({
    method: "GET",
    path: "/install/already-installed"
  });

  assert.equal(response.status, 303);
  assert.equal(response.headers.location, "/install/already-installed");
  assert.equal(alreadyInstalled.status, 200);
  assert.match(alreadyInstalled.body, /data-wpsc-already-installed/);
});

test("createHttpInstaller blocks installer API when installation is locked", async () => {
  const installer = createHttpInstaller({
    installationLock: {
      read: async () => ({
        installed: true,
        lockPath: "/release/config/install.lock"
      })
    }
  });

  const response = await installer.handle({
    body: {},
    method: "POST",
    path: "/install/start"
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.error.code, "install.lock.exists");
});
