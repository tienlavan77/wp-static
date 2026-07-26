import assert from "node:assert/strict";
import test from "node:test";
import createWebInstallerUi, {
  WEB_INSTALLER_UI_VERSION
} from "../src/installer/createWebInstallerUi.js";

test("createWebInstallerUi renders installer shell", () => {
  const ui = createWebInstallerUi({
    apiBase: "/install-api",
    title: "Install WPSC"
  });

  assert.equal(ui.version, WEB_INSTALLER_UI_VERSION);
  assert.equal(ui.title, "Install WPSC");
  assert.equal(ui.apiBase, "/install-api");
  assert.match(ui.html, /<main class="wpsc-installer"/);
  assert.match(ui.html, /data-wpsc-installer-form/);
  assert.match(ui.html, /data-wpsc-installer-progress/);
  assert.match(ui.html, /\/install-api/);
});

test("createWebInstallerUi renders production setup input fields", () => {
  const ui = createWebInstallerUi();

  for (const field of [
    "siteName",
    "domain",
    "wordpressUrl",
    "woocommerceUrl",
    "wordpressUsername",
    "wordpressApplicationPassword",
    "wooConsumerKey",
    "wooConsumerSecret",
    "sessionSecret",
    "authBridgeSecret",
    "webhookSecret",
    "runtimePort"
  ]) {
    assert.match(ui.html, new RegExp(`name="${field}"`));
  }

  assert.match(ui.html, /Secrets stay out of public output/);
});

test("createWebInstallerUi exposes separate css and js assets", () => {
  const ui = createWebInstallerUi();

  assert.match(ui.assets.css, /\.wpsc-installer/);
  assert.match(ui.assets.css, /#0c6349/);
  assert.match(ui.assets.js, /fetch\(apiBase \+ path/);
  assert.match(ui.assets.js, /requiredFields/);
  assert.match(ui.assets.js, /Missing setup fields/);
  assert.match(ui.assets.js, /renderState/);
  assert.match(ui.assets.js, /runInstall/);
  assert.match(ui.assets.js, /"\/check", "\/config", "\/build"/);
});

test("createWebInstallerUi escapes title and api base", () => {
  const ui = createWebInstallerUi({
    apiBase: "/api/install?x=<bad>",
    title: "<Install>"
  });

  assert.match(ui.html, /&lt;Install&gt;/);
  assert.match(ui.html, /data-api-base="\/api\/install\?x=&lt;bad&gt;"/);
});
