# Sprint 6 - Commit 003 Diff Summary

## Commit

003 - Setup UI Inputs

## Scope

Expand the browser setup experience so a production release can collect the credentials required to connect to real WordPress and WooCommerce sources.

## Files Changed

- `src/installer/createWebInstallerUi.js`
- `src/release/createReleasePackageStructure.js`
- `test/webInstallerUi.test.js`
- `test/releasePackageStructure.test.js`
- `outputs/sprint-6/commit-003-setup-ui-inputs.diff.md`
- `outputs/sprint-6/reviews/commit-003-review.md`

## What Changed

- Added setup fields for WooCommerce Consumer Key and Consumer Secret.
- Added setup fields for WordPress username and application password.
- Added setup fields for session secret, auth bridge secret, webhook secret, and optional runtime port.
- Added browser-side validation for required fields and URL fields.
- Expanded the release fallback setup form rendered by `installer/setup.php`.
- Added tests to lock the required setup fields in both installer UI and release package output.

## Architecture Notes

This commit does not write secrets or persist configuration.

Secret persistence belongs to Sprint 6 Commit 004 - Release Config Writer.

## Verification

```bash
node --check src/installer/createWebInstallerUi.js
node --check src/release/createReleasePackageStructure.js
node --test test/webInstallerUi.test.js test/releasePackageStructure.test.js
```

## Audit Result

Ready for review.

## Code Diff

```diff
diff --git a/src/installer/createWebInstallerUi.js b/src/installer/createWebInstallerUi.js
index 1df0375..4725269 100644
--- a/src/installer/createWebInstallerUi.js
+++ b/src/installer/createWebInstallerUi.js
@@ -18,6 +18,20 @@ const diagnosticsEl = document.querySelector("[data-wpsc-installer-diagnostics]"
 const form = document.querySelector("[data-wpsc-installer-form]");
 const submitButton = form.querySelector("button[type='submit']");
 
+const requiredFields = [
+  "siteName",
+  "domain",
+  "wordpressUrl",
+  "woocommerceUrl",
+  "wooConsumerKey",
+  "wooConsumerSecret",
+  "wordpressUsername",
+  "wordpressApplicationPassword",
+  "sessionSecret",
+  "authBridgeSecret",
+  "webhookSecret"
+];
+
 function renderState(payload) {
   const state = payload.state || {};
   stateEl.textContent = state.step || "START";
@@ -38,6 +52,22 @@ function renderError(error) {
   diagnosticsEl.insertAdjacentHTML("beforeend", "<li class=\\"error\\">" + (error.message || "Installation failed.") + "</li>");
 }
 
+function validatePayload(payload) {
+  const missing = requiredFields.filter((field) => !String(payload[field] || "").trim());
+
+  if (missing.length > 0) {
+    throw new Error("Missing setup fields: " + missing.join(", ") + ".");
+  }
+
+  for (const field of ["domain", "wordpressUrl", "woocommerceUrl"]) {
+    try {
+      new URL(payload[field]);
+    } catch {
+      throw new Error("Invalid URL for " + field + ".");
+    }
+  }
+}
+
 async function postJson(path, body) {
   const response = await fetch(apiBase + path, {
     method: "POST",
@@ -81,6 +111,7 @@ form.addEventListener("submit", async (event) => {
   diagnosticsEl.innerHTML = "";
 
   try {
+    validatePayload(payload);
     await runInstall(payload);
   } catch (error) {
     renderError(error);
@@ -129,10 +160,28 @@ body {
   padding: 28px;
 }
 
+.wpsc-installer fieldset {
+  border: 1px solid #d9e5e1;
+  margin: 0 0 20px;
+  padding: 20px;
+}
+
+.wpsc-installer legend {
+  color: #0c6349;
+  font-weight: 600;
+  padding: 0 8px;
+}
+
+.wpsc-installer__grid {
+  display: grid;
+  gap: 16px;
+  grid-template-columns: repeat(2, minmax(0, 1fr));
+}
+
 .wpsc-installer label {
   display: grid;
   gap: 8px;
-  margin-bottom: 16px;
+  margin-bottom: 0;
 }
 
 .wpsc-installer input {
@@ -142,6 +191,12 @@ body {
   padding: 12px;
 }
 
+.wpsc-installer small {
+  color: #5d756d;
+  display: block;
+  margin-top: 8px;
+}
+
 .wpsc-installer button {
   border: 0;
   border-radius: 0;
@@ -169,6 +224,10 @@ body {
   .wpsc-installer {
     grid-template-columns: 1fr;
   }
+
+  .wpsc-installer__grid {
+    grid-template-columns: 1fr;
+  }
 }
 `;
 }
@@ -197,18 +256,75 @@ export default function createWebInstallerUi(options = {}) {
     <section class="wpsc-installer__main">
       <div class="wpsc-installer__panel">
         <form data-wpsc-installer-form>
-          <label>
-            Site domain
-            <input name="domain" type="url" placeholder="https://example.com">
-          </label>
-          <label>
-            WordPress API URL
-            <input name="wordpressUrl" type="url" placeholder="https://api.example.com">
-          </label>
-          <label>
-            Site name
-            <input name="siteName" type="text" placeholder="My WPSC Site">
-          </label>
+          <fieldset>
+            <legend>Site</legend>
+            <div class="wpsc-installer__grid">
+              <label>
+                Site name
+                <input name="siteName" type="text" placeholder="Tin Sinh Phat" required>
+              </label>
+              <label>
+                Site domain
+                <input name="domain" type="url" placeholder="https://example.com" required>
+              </label>
+            </div>
+          </fieldset>
+          <fieldset>
+            <legend>WordPress source</legend>
+            <div class="wpsc-installer__grid">
+              <label>
+                WordPress API URL
+                <input name="wordpressUrl" type="url" placeholder="https://api.example.com" required>
+              </label>
+              <label>
+                WooCommerce API URL
+                <input name="woocommerceUrl" type="url" placeholder="https://api.example.com" required>
+              </label>
+              <label>
+                WordPress username
+                <input name="wordpressUsername" type="text" autocomplete="username" placeholder="admin@example.com" required>
+              </label>
+              <label>
+                WordPress application password
+                <input name="wordpressApplicationPassword" type="password" autocomplete="current-password" placeholder="xxxx xxxx xxxx xxxx" required>
+              </label>
+            </div>
+          </fieldset>
+          <fieldset>
+            <legend>WooCommerce credentials</legend>
+            <div class="wpsc-installer__grid">
+              <label>
+                Consumer key
+                <input name="wooConsumerKey" type="password" autocomplete="off" placeholder="ck_xxx" required>
+              </label>
+              <label>
+                Consumer secret
+                <input name="wooConsumerSecret" type="password" autocomplete="off" placeholder="cs_xxx" required>
+              </label>
+            </div>
+          </fieldset>
+          <fieldset>
+            <legend>Runtime secrets</legend>
+            <div class="wpsc-installer__grid">
+              <label>
+                Session secret
+                <input name="sessionSecret" type="password" autocomplete="off" placeholder="Long random secret" required>
+              </label>
+              <label>
+                Auth bridge secret
+                <input name="authBridgeSecret" type="password" autocomplete="off" placeholder="Long random secret" required>
+              </label>
+              <label>
+                Webhook secret
+                <input name="webhookSecret" type="password" autocomplete="off" placeholder="Long random secret" required>
+              </label>
+              <label>
+                Runtime port
+                <input name="runtimePort" type="number" min="1" max="65535" placeholder="8787">
+              </label>
+            </div>
+            <small>Secrets stay out of public output and will be written by the release config writer.</small>
+          </fieldset>
           <button type="submit">Start installation</button>
         </form>
         <ul data-wpsc-installer-diagnostics></ul>
```
