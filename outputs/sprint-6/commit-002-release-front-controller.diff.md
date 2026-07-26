# Sprint 6 - Commit 002 Diff Summary

## Commit

002 - Release Front Controller

## Scope

Add first-visit setup support to the release package without requiring custom virtual host routes.

## Files Changed

- `src/release/createReleasePackageStructure.js`
- `test/releasePackageStructure.test.js`
- `outputs/sprint-6/commit-002-release-front-controller.diff.md`
- `outputs/sprint-6/reviews/commit-002-review.md`

## What Changed

- Added `public/index.php` to release package files.
- `public/index.php` checks `config/install.lock`.
- If the lock is missing, it renders `installer/setup.php`.
- If the lock exists, it serves static route fallback behavior.
- Added `installer/bootstrap.php` lock detection.
- Added `installer/setup.php` placeholder setup fallback.

## Architecture Notes

The front controller is intentionally thin.

It does not:

- fetch WordPress data
- build static output
- manage secrets
- duplicate Browser Wizard business logic

Those belong to later Sprint 6 commits.

## Verification

```bash
node --check src/release/createReleasePackageStructure.js
node --test test/releasePackageStructure.test.js
```

## Audit Result

Ready for review.

## Code Diff

```diff
diff --git a/src/release/createReleasePackageStructure.js b/src/release/createReleasePackageStructure.js
index 451bec6..925eb1e 100644
--- a/src/release/createReleasePackageStructure.js
+++ b/src/release/createReleasePackageStructure.js
@@ -14,15 +14,121 @@ export const RELEASE_PACKAGE_DIRECTORIES = [
 ];
 
 export const RELEASE_PACKAGE_FILES = [
+  {
+    contents: `<?php
+$releaseRoot = dirname(__DIR__);
+$lockPath = $releaseRoot . '/config/install.lock';
+$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
+
+if (!is_file($lockPath)) {
+    http_response_code(200);
+    header('content-type: text/html; charset=utf-8');
+    require $releaseRoot . '/installer/setup.php';
+    exit;
+}
+
+$staticPath = __DIR__ . $requestPath;
+
+if ($requestPath !== '/' && is_file($staticPath)) {
+    return false;
+}
+
+if ($requestPath !== '/' && is_file($staticPath . '.html')) {
+    header('content-type: text/html; charset=utf-8');
+    readfile($staticPath . '.html');
+    exit;
+}
+
+$indexPath = __DIR__ . '/index.html';
+
+if (is_file($indexPath)) {
+    header('content-type: text/html; charset=utf-8');
+    readfile($indexPath);
+    exit;
+}
+
+http_response_code(404);
+echo 'WPSC static site is not built yet.';
+`,
+    path: "public/index.php",
+    purpose: "Front controller for first-visit setup and static route fallback."
+  },
   {
     contents: "<?php\nrequire __DIR__ . '/installer/bootstrap.php';\n",
     path: "index.php",
-    purpose: "Front controller for production hosting."
+    purpose: "Compatibility entrypoint for hosts pointed at the release root."
   },
   {
-    contents: "<?php\n// WPSC installer bootstrap placeholder.\n",
+    contents: `<?php
+$releaseRoot = dirname(__DIR__);
+$lockPath = $releaseRoot . '/config/install.lock';
+
+if (is_file($lockPath)) {
+    http_response_code(409);
+    header('content-type: text/html; charset=utf-8');
+    echo '<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>WPSC Installed</title></head><body><main data-wpsc-already-installed><h1>WPSC is already installed</h1><p>The setup wizard is locked.</p></main></body></html>';
+    return;
+}
+
+require __DIR__ . '/setup.php';
+`,
     path: "installer/bootstrap.php",
-    purpose: "Installer bootstrap entry for Commit 002 HTTP Installer."
+    purpose: "Installer bootstrap entry with install lock detection."
+  },
+  {
+    contents: `<!doctype html>
+<html lang="vi">
+<head>
+  <meta charset="utf-8">
+  <meta name="viewport" content="width=device-width, initial-scale=1">
+  <title>WPSC Setup</title>
+  <style>
+    body {
+      margin: 0;
+      background: #f4f7f6;
+      color: #15352d;
+      font: 13pt -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
+    }
+    main {
+      box-sizing: border-box;
+      min-height: 100vh;
+      display: grid;
+      place-items: center;
+      padding: 32px;
+    }
+    section {
+      max-width: 720px;
+      border: 1px solid #d9e5e1;
+      background: #fff;
+      padding: 32px;
+    }
+    h1 {
+      margin-top: 0;
+      color: #0c6349;
+      font-size: 2rem;
+      font-weight: 500;
+    }
+    code {
+      background: #eef6f3;
+      padding: 2px 6px;
+    }
+  </style>
+</head>
+<body>
+  <main data-wpsc-setup-fallback>
+    <section>
+      <h1>WPSC Setup</h1>
+      <p>This release is not installed yet.</p>
+      <p>The setup app will run here on first visit without requiring a custom virtual host route.</p>
+      <p>Next step: connect this fallback to the shared Browser Wizard and Production CLI service layer.</p>
+      <p>Expected generated lock: <code>config/install.lock</code></p>
+    </section>
+  </main>
+</body>
+</html>
+`,
+    path: "installer/setup.php",
+    purpose: "First-visit setup fallback rendered before install.lock exists."
   },
   {
     contents: "{\n  \"installed\": false\n}\n",
@@ -30,7 +136,7 @@ export const RELEASE_PACKAGE_FILES = [
     purpose: "Installation state placeholder before install.lock exists."
   },
   {
-    contents: "# WPSC Release Package\n\nUpload this directory to hosting, point the domain to `public`, then open `/install`.\n",
+    contents: "# WPSC Release Package\n\nUpload this directory to hosting, point the domain to `public`, then open the domain root to start setup.\n",
     path: "README.md",
     purpose: "Release package instructions."
   }
diff --git a/test/releasePackageStructure.test.js b/test/releasePackageStructure.test.js
index 97e719f..1d367ad 100644
--- a/test/releasePackageStructure.test.js
+++ b/test/releasePackageStructure.test.js
@@ -29,8 +29,20 @@ test("createReleasePackageStructure includes release bootstrap files", () => {
     RELEASE_PACKAGE_FILES.map((file) => file.path)
   );
   assert.match(
-    structure.files.find((file) => file.path === "index.php").contents,
-    /installer\/bootstrap.php/
+    structure.files.find((file) => file.path === "public/index.php").contents,
+    /config\/install\.lock/
+  );
+  assert.match(
+    structure.files.find((file) => file.path === "public/index.php").contents,
+    /installer\/setup\.php/
+  );
+  assert.match(
+    structure.files.find((file) => file.path === "installer/bootstrap.php").contents,
+    /data-wpsc-already-installed/
+  );
+  assert.match(
+    structure.files.find((file) => file.path === "installer/setup.php").contents,
+    /data-wpsc-setup-fallback/
   );
   assert.match(
     structure.files.find((file) => file.path === "config/install-state.json").contents,
```
