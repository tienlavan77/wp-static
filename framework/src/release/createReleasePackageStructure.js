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
    form {
      display: grid;
      gap: 20px;
    }
    fieldset {
      border: 1px solid #d9e5e1;
      margin: 0;
      padding: 20px;
    }
    legend {
      color: #0c6349;
      font-weight: 600;
      padding: 0 8px;
    }
    .grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    label {
      display: grid;
      gap: 8px;
    }
    input {
      border: 1px solid #b8cbc5;
      border-radius: 0;
      font: inherit;
      padding: 12px;
    }
    button {
      border: 0;
      border-radius: 0;
      background: #0c6349;
      color: #fff;
      cursor: pointer;
      font: inherit;
      padding: 12px 18px;
    }
    small {
      color: #5d756d;
    }
    @media (max-width: 760px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main data-wpsc-setup-fallback>
    <section>
      <h1>WPSC Setup</h1>
      <p>This release is not installed yet.</p>
      <form method="post" action="/setup" data-wpsc-release-setup-form>
        <fieldset>
          <legend>Site</legend>
          <div class="grid">
            <label>Site name <input name="siteName" type="text" required></label>
            <label>Site domain <input name="domain" type="url" required></label>
          </div>
        </fieldset>
        <fieldset>
          <legend>WordPress source</legend>
          <div class="grid">
            <label>WordPress API URL <input name="wordpressUrl" type="url" required></label>
            <label>WooCommerce API URL <input name="woocommerceUrl" type="url" required></label>
            <label>WordPress username <input name="wordpressUsername" type="text" autocomplete="username" required></label>
            <label>WordPress application password <input name="wordpressApplicationPassword" type="password" autocomplete="current-password" required></label>
          </div>
        </fieldset>
        <fieldset>
          <legend>WooCommerce credentials</legend>
          <div class="grid">
            <label>Consumer key <input name="wooConsumerKey" type="password" autocomplete="off" required></label>
            <label>Consumer secret <input name="wooConsumerSecret" type="password" autocomplete="off" required></label>
          </div>
        </fieldset>
        <fieldset>
          <legend>Runtime secrets</legend>
          <div class="grid">
            <label>Session secret <input name="sessionSecret" type="password" autocomplete="off" required></label>
            <label>Auth bridge secret <input name="authBridgeSecret" type="password" autocomplete="off" required></label>
            <label>Webhook secret <input name="webhookSecret" type="password" autocomplete="off" required></label>
            <label>Runtime port <input name="runtimePort" type="number" min="1" max="65535" placeholder="8787"></label>
          </div>
        </fieldset>
        <small>Expected generated lock: <code>config/install.lock</code>. Secrets must never be written to public output.</small>
        <button type="submit">Start installation</button>
      </form>
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
