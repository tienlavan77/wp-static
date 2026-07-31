import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export default async function writeAdminApp(outputDir, options = {}) {
  const adminAssetsDir = path.join(outputDir, "admin-assets");
  const auth = createAdminAuthConfig(options.config);

  await mkdir(adminAssetsDir, { recursive: true });
  await Promise.all([
    writeFile(path.join(outputDir, "admin.html"), createAdminHtml(), "utf8"),
    writeFile(path.join(adminAssetsDir, "admin.css"), createAdminCss(), "utf8"),
    writeFile(path.join(adminAssetsDir, "admin.js"), createAdminJs(), "utf8"),
    writeFile(path.join(adminAssetsDir, "config.json"), `${JSON.stringify({
      version: 1,
      auth
    }, null, 2)}\n`, "utf8")
  ]);

  return {
    authRequired: auth.required,
    files: [
      "admin.html",
      "admin-assets/admin.css",
      "admin-assets/admin.js",
      "admin-assets/config.json"
    ],
    outputPath: "admin.html"
  };
}

function createAdminAuthConfig(config = {}) {
  const tokenEnv = config.builder?.editor?.tokenEnv ?? null;
  const token = tokenEnv ? process.env[tokenEnv] : null;

  return {
    required: typeof token === "string" && token.trim() !== "",
    tokenEnv,
    tokenHash: typeof token === "string" && token.trim() !== ""
      ? createHash("sha256").update(token).digest("hex")
      : null
  };
}

function createAdminHtml() {
  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>WPSC Admin</title>
    <link rel="stylesheet" href="/admin-assets/admin.css?v=3">
  </head>
  <body>
    <main class="admin-shell" data-admin-root>
      <section class="admin-card" data-login-view>
        <p class="admin-eyebrow">WPSC Admin</p>
        <h1>Đăng nhập Builder</h1>
        <form class="admin-form" data-login-form>
          <label>
            Token quản trị
            <input name="token" type="password" autocomplete="current-password" data-token-input>
          </label>
          <p class="admin-error" data-login-error hidden></p>
          <button type="submit">Đăng nhập</button>
        </form>
      </section>

      <section class="admin-dashboard" data-dashboard-view hidden>
        <header class="admin-topbar">
          <div>
            <p class="admin-eyebrow">WPSC Admin</p>
            <h1>UI Builder</h1>
          </div>
          <button type="button" data-logout>Đăng xuất</button>
        </header>
        <div class="admin-stats" data-admin-stats>
          <article><strong data-stat-routes>0</strong><span>Routes</span></article>
          <article><strong data-stat-content>0</strong><span>Content files</span></article>
          <article><strong data-stat-products>0</strong><span>Products</span></article>
          <article><strong data-stat-taxonomies>0</strong><span>Taxonomies</span></article>
        </div>
        <div class="admin-workbench">
          <aside class="admin-sidebar">
            <label>
              Tìm trang hoặc nội dung
              <input type="search" placeholder="Nhập slug, title, route..." data-route-search>
            </label>
            <div class="admin-tabs" role="tablist" aria-label="Route filters">
              <button type="button" class="is-active" data-filter="all">Tất cả</button>
              <button type="button" data-filter="page">Page</button>
              <button type="button" data-filter="product">Product</button>
              <button type="button" data-filter="archive">Archive</button>
            </div>
            <div class="admin-route-list" data-route-list></div>
          </aside>
          <section class="admin-detail" data-route-detail>
            <p class="admin-eyebrow">Chọn route</p>
            <h2>Chưa chọn nội dung</h2>
            <p class="admin-muted">Chọn một route bên trái để xem dữ liệu builder sẽ dùng.</p>
          </section>
        </div>
      </section>
    </main>
    <script type="module" src="/admin-assets/admin.js?v=3"></script>
  </body>
</html>
`;
}

function createAdminCss() {
  return `:root {
  color-scheme: light;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13pt;
  color: #17201a;
  background: #f5f7f3;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

.admin-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
}

.admin-card,
.admin-dashboard {
  width: min(100%, 720px);
  background: #ffffff;
  border: 1px solid #dde5dc;
  border-radius: 8px;
  box-shadow: 0 20px 50px rgba(25, 43, 31, 0.08);
  padding: 28px;
}

.admin-dashboard {
  width: min(100%, 1340px);
}

.admin-eyebrow {
  margin: 0 0 8px;
  color: #4d6b58;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 20px;
  font-size: 28px;
  letter-spacing: 0;
}

.admin-form {
  display: grid;
  gap: 16px;
}

label {
  display: grid;
  gap: 8px;
  font-weight: 700;
}

input {
  width: 100%;
  border: 1px solid #cfd8cf;
  border-radius: 6px;
  font: inherit;
  padding: 12px 14px;
}

button,
.admin-grid a {
  border: 0;
  border-radius: 6px;
  background: #145c43;
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  padding: 12px 16px;
  text-align: center;
  text-decoration: none;
}

.admin-error {
  margin: 0;
  color: #a13622;
}

.admin-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.admin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.admin-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.admin-stats article {
  border: 1px solid #dde5dc;
  border-radius: 8px;
  padding: 14px;
  background: #f9fbf8;
}

.admin-stats strong {
  display: block;
  font-size: 26px;
}

.admin-stats span,
.admin-muted {
  color: #607064;
}

.admin-workbench {
  display: grid;
  grid-template-columns: minmax(280px, 380px) 1fr;
  gap: 18px;
  min-height: 560px;
}

.admin-sidebar,
.admin-detail {
  border: 1px solid #dde5dc;
  border-radius: 8px;
  background: #ffffff;
  padding: 16px;
}

.admin-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  margin: 14px 0;
}

.admin-tabs button {
  padding: 9px 8px;
  background: #edf3ed;
  color: #244532;
}

.admin-tabs button.is-active {
  background: #145c43;
  color: #ffffff;
}

.admin-route-list {
  display: grid;
  gap: 8px;
  max-height: 430px;
  overflow: auto;
  padding-right: 4px;
}

.admin-route-item {
  width: 100%;
  border: 1px solid #dde5dc;
  border-radius: 6px;
  background: #ffffff;
  color: #17201a;
  display: grid;
  gap: 3px;
  padding: 10px;
  text-align: left;
}

.admin-route-item.is-active {
  border-color: #145c43;
  box-shadow: inset 3px 0 0 #145c43;
}

.admin-route-item span {
  color: #607064;
  font-size: 12px;
}

.admin-detail h2 {
  margin: 0 0 8px;
  font-size: 24px;
}

.admin-detail dl {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 10px;
  margin: 18px 0;
}

.admin-detail dt {
  color: #607064;
}

.admin-detail dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.admin-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.admin-actions a {
  border-radius: 6px;
  background: #145c43;
  color: #ffffff;
  font-weight: 700;
  padding: 11px 14px;
  text-decoration: none;
}

.admin-actions a.secondary {
  background: #edf3ed;
  color: #244532;
}

@media (max-width: 900px) {
  .admin-stats,
  .admin-workbench {
    grid-template-columns: 1fr;
  }
}
`;
}

function createAdminJs() {
  return `const SESSION_KEY = "wpsc_admin_session";

const root = document.querySelector("[data-admin-root]");
const loginView = document.querySelector("[data-login-view]");
const dashboardView = document.querySelector("[data-dashboard-view]");
const loginForm = document.querySelector("[data-login-form]");
const tokenInput = document.querySelector("[data-token-input]");
const loginError = document.querySelector("[data-login-error]");
const logoutButton = document.querySelector("[data-logout]");
const routeList = document.querySelector("[data-route-list]");
const routeDetail = document.querySelector("[data-route-detail]");
const routeSearch = document.querySelector("[data-route-search]");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const statRoutes = document.querySelector("[data-stat-routes]");
const statContent = document.querySelector("[data-stat-content]");
const statProducts = document.querySelector("[data-stat-products]");
const statTaxonomies = document.querySelector("[data-stat-taxonomies]");

const config = await loadConfig();
const session = readSession();
const adminState = {
  filter: "all",
  query: "",
  routes: [],
  selectedRoute: null
};

if (isSessionValid(session, config)) {
  showDashboard();
} else {
  showLogin();
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const token = tokenInput?.value ?? "";
  let tokenHash = "";

  try {
    tokenHash = await sha256(token);
  } catch {
    showError("Không thể xác thực token trên trình duyệt này.");
    return;
  }

  if (config.auth.required && tokenHash !== config.auth.tokenHash) {
    showError("Token quản trị không đúng.");
    return;
  }

  if (!config.auth.required && token.trim() === "") {
    showError("Nhập token quản trị để xác nhận phiên admin.");
    return;
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify({
    createdAt: Date.now(),
    token,
    tokenHash
  }));
  showDashboard();
});

logoutButton?.addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  showLogin();
});

async function loadConfig() {
  const response = await fetch("/admin-assets/config.json", {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Không thể tải cấu hình admin.");
  }

  return response.json();
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
  } catch {
    return null;
  }
}

function isSessionValid(session, appConfig) {
  if (!session || typeof session !== "object") {
    return false;
  }

  if (appConfig.auth.required) {
    return session.tokenHash === appConfig.auth.tokenHash;
  }

  return typeof session.token === "string" && session.token.trim() !== "";
}

function showLogin() {
  root?.classList.remove("is-authenticated");
  loginView.hidden = false;
  dashboardView.hidden = true;
  tokenInput?.focus();
}

function showDashboard() {
  root?.classList.add("is-authenticated");
  loginView.hidden = true;
  dashboardView.hidden = false;
  hideError();
  loadAdminData();
}

routeSearch?.addEventListener("input", () => {
  adminState.query = routeSearch.value.trim().toLowerCase();
  renderRouteList();
});

for (const button of filterButtons) {
  button.addEventListener("click", () => {
    adminState.filter = button.dataset.filter ?? "all";
    filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    renderRouteList();
  });
}

async function loadAdminData() {
  if (adminState.routes.length > 0) {
    renderRouteList();
    return;
  }

  try {
    const [routeManifest, contentManifest] = await Promise.all([
      fetchJson("/data/manifest.json"),
      fetchJson("/data/content/manifest.json")
    ]);
    adminState.routes = routeManifest.routes ?? [];
    renderStats(routeManifest, contentManifest);
    renderRouteList();
  } catch {
    if (routeList) {
      routeList.innerHTML = '<p class="admin-muted">Không tải được dữ liệu routes.</p>';
    }
  }
}

async function fetchJson(url) {
  const response = await fetch(url, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(\`Request failed: \${url}\`);
  }

  return response.json();
}

function renderStats(routeManifest, contentManifest) {
  setText(statRoutes, String(routeManifest.routes?.length ?? 0));
  setText(statContent, String(contentManifest.files?.length ?? 0));
  setText(statProducts, String(contentManifest.groups?.products ?? 0));
  setText(statTaxonomies, String(contentManifest.groups?.taxonomies ?? 0));
}

function renderRouteList() {
  if (!routeList) {
    return;
  }

  const routes = filterRoutes(adminState.routes);

  if (routes.length === 0) {
    routeList.innerHTML = '<p class="admin-muted">Không có route phù hợp.</p>';
    return;
  }

  routeList.innerHTML = routes.map((route) => {
    const active = adminState.selectedRoute?.path === route.path ? " is-active" : "";

    return \`<button type="button" class="admin-route-item\${active}" data-route-path="\${escapeAttribute(route.path)}">
      <strong>\${escapeHtml(route.path)}</strong>
      <span>\${escapeHtml(route.contentType)} · \${escapeHtml(route.contentId)}</span>
    </button>\`;
  }).join("");

  routeList.querySelectorAll("[data-route-path]").forEach((button) => {
    button.addEventListener("click", () => {
      adminState.selectedRoute = adminState.routes.find((route) => route.path === button.dataset.routePath) ?? null;
      renderRouteList();
      renderRouteDetail();
    });
  });
}

function filterRoutes(routes) {
  return routes.filter((route) => {
    const contentType = route.contentType ?? "";
    const typeGroup = contentType.startsWith("archive:") ? "archive" : contentType;
    const matchesFilter = adminState.filter === "all" || typeGroup === adminState.filter;
    const haystack = [route.path, route.contentType, route.contentId, route.dataPath]
      .join(" ")
      .toLowerCase();

    return matchesFilter && haystack.includes(adminState.query);
  });
}

function renderRouteDetail() {
  if (!routeDetail || !adminState.selectedRoute) {
    return;
  }

  const route = adminState.selectedRoute;
  const builderUrl = \`/builder.html?route=\${encodeURIComponent(route.path)}&data=\${encodeURIComponent(route.dataPath)}\`;

  routeDetail.innerHTML = \`<p class="admin-eyebrow">Route đang chọn</p>
    <h2>\${escapeHtml(route.path)}</h2>
    <p class="admin-muted">\${escapeHtml(route.contentType)} · \${escapeHtml(route.contentId)}</p>
    <dl>
      <dt>HTML</dt><dd>\${escapeHtml(route.outputPath)}</dd>
      <dt>Route data</dt><dd>\${escapeHtml(route.dataPath)}</dd>
      <dt>Content type</dt><dd>\${escapeHtml(route.contentType)}</dd>
      <dt>Content ID</dt><dd>\${escapeHtml(route.contentId)}</dd>
    </dl>
    <div class="admin-actions">
      <a href="\${escapeAttribute(route.path)}" target="_blank" rel="noreferrer">Mở trang</a>
      <a href="\${escapeAttribute(route.dataPath)}" target="_blank" rel="noreferrer" class="secondary">Xem JSON</a>
      <a href="\${escapeAttribute(builderUrl)}" class="secondary">Mở Builder</a>
    </div>\`;
}

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function showError(message) {
  if (!loginError) {
    return;
  }

  loginError.hidden = false;
  loginError.textContent = message;
}

function hideError() {
  if (!loginError) {
    return;
  }

  loginError.hidden = true;
  loginError.textContent = "";
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);

  return toHex(sha256Bytes(bytes));
}

function toHex(bytes) {
  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function sha256Bytes(bytes) {
  const constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const bitLength = bytes.length * 8;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  for (let i = 0; i < 8; i += 1) {
    padded[paddedLength - 1 - i] = (bitLength / 2 ** (i * 8)) & 0xff;
  }

  const words = new Uint32Array(64);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      const index = offset + i * 4;
      words[i] = (
        (padded[index] << 24) |
        (padded[index + 1] << 16) |
        (padded[index + 2] << 8) |
        padded[index + 3]
      ) >>> 0;
    }

    for (let i = 16; i < 64; i += 1) {
      const s0 = rotateRight(words[i - 15], 7) ^ rotateRight(words[i - 15], 18) ^ (words[i - 15] >>> 3);
      const s1 = rotateRight(words[i - 2], 17) ^ rotateRight(words[i - 2], 19) ^ (words[i - 2] >>> 10);
      words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;

    for (let i = 0; i < 64; i += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + constants[i] + words[i]) >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }

  const output = new Uint8Array(32);

  for (let i = 0; i < hash.length; i += 1) {
    output[i * 4] = hash[i] >>> 24;
    output[i * 4 + 1] = hash[i] >>> 16;
    output[i * 4 + 2] = hash[i] >>> 8;
    output[i * 4 + 3] = hash[i];
  }

  return output;
}

function rotateRight(value, bits) {
  return (value >>> bits) | (value << (32 - bits));
}
`;
}
