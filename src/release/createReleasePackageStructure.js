export const RELEASE_PACKAGE_STRUCTURE_VERSION = "1.0";

export const RELEASE_PACKAGE_DIRECTORIES = [
  "public",
  "themes",
  "plugins",
  "storage",
  "storage/cache",
  "storage/logs",
  "storage/reports",
  "config",
  "installer",
  "vendor"
];

export const RELEASE_PACKAGE_FILES = [
  {
    contents: `<?php
$releaseRoot = dirname(__DIR__);
$lockPath = $releaseRoot . '/config/install.lock';
$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if (!is_file($lockPath)) {
    http_response_code(200);
    header('content-type: text/html; charset=utf-8');
    require $releaseRoot . '/installer/setup.php';
    exit;
}

$staticPath = __DIR__ . $requestPath;

if ($requestPath !== '/' && is_file($staticPath)) {
    return false;
}

if ($requestPath !== '/' && is_file($staticPath . '.html')) {
    header('content-type: text/html; charset=utf-8');
    readfile($staticPath . '.html');
    exit;
}

$indexPath = __DIR__ . '/index.html';

if (is_file($indexPath)) {
    header('content-type: text/html; charset=utf-8');
    readfile($indexPath);
    exit;
}

http_response_code(404);
echo 'WPSC static site is not built yet.';
`,
    path: "public/index.php",
    purpose: "Front controller for first-visit setup and static route fallback."
  },
  {
    contents: "<?php\nrequire __DIR__ . '/installer/bootstrap.php';\n",
    path: "index.php",
    purpose: "Compatibility entrypoint for hosts pointed at the release root."
  },
  {
    contents: `<?php
$releaseRoot = dirname(__DIR__);
$lockPath = $releaseRoot . '/config/install.lock';

if (is_file($lockPath)) {
    http_response_code(409);
    header('content-type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>WPSC Installed</title></head><body><main data-wpsc-already-installed><h1>WPSC is already installed</h1><p>The setup wizard is locked.</p></main></body></html>';
    return;
}

require __DIR__ . '/setup.php';
`,
    path: "installer/bootstrap.php",
    purpose: "Installer bootstrap entry with install lock detection."
  },
  {
    contents: `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WPSC Setup</title>
  <style>
    body {
      margin: 0;
      background: #f4f7f6;
      color: #15352d;
      font: 13pt -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    main {
      box-sizing: border-box;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 32px;
    }
    section {
      max-width: 720px;
      border: 1px solid #d9e5e1;
      background: #fff;
      padding: 32px;
    }
    h1 {
      margin-top: 0;
      color: #0c6349;
      font-size: 2rem;
      font-weight: 500;
    }
    code {
      background: #eef6f3;
      padding: 2px 6px;
    }
  </style>
</head>
<body>
  <main data-wpsc-setup-fallback>
    <section>
      <h1>WPSC Setup</h1>
      <p>This release is not installed yet.</p>
      <p>The setup app will run here on first visit without requiring a custom virtual host route.</p>
      <p>Next step: connect this fallback to the shared Browser Wizard and Production CLI service layer.</p>
      <p>Expected generated lock: <code>config/install.lock</code></p>
    </section>
  </main>
</body>
</html>
`,
    path: "installer/setup.php",
    purpose: "First-visit setup fallback rendered before install.lock exists."
  },
  {
    contents: "{\n  \"installed\": false\n}\n",
    path: "config/install-state.json",
    purpose: "Installation state placeholder before install.lock exists."
  },
  {
    contents: "# WPSC Release Package\n\nUpload this directory to hosting, point the domain to `public`, then open the domain root to start setup.\n",
    path: "README.md",
    purpose: "Release package instructions."
  }
];

function normalizeMode(mode) {
  return mode === "shared-hosting" ? "shared-hosting" : "vps";
}

export default function createReleasePackageStructure(options = {}) {
  const mode = normalizeMode(options.mode);
  const packageName = options.packageName || "wpsc-release";

  return {
    directories: [...RELEASE_PACKAGE_DIRECTORIES],
    files: RELEASE_PACKAGE_FILES.map((file) => ({ ...file })),
    immutable: {
      mayCreate: [
        "config/runtime.json",
        "config/project.json",
        "config/install.lock",
        "storage/reports/install-report.md",
        "public build output",
        "runtime metadata"
      ],
      mustNotModify: [
        "themes",
        "plugins",
        "vendor framework source",
        "release assets"
      ]
    },
    mode,
    packageName,
    publicRoot: "public",
    version: RELEASE_PACKAGE_STRUCTURE_VERSION
  };
}
