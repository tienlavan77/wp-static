export const WEB_INSTALLER_UI_VERSION = "1.0";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createInstallerScript(options = {}) {
  const apiBase = options.apiBase || "/api/install";

  return `const apiBase = ${JSON.stringify(apiBase)};
const stateEl = document.querySelector("[data-wpsc-installer-state]");
const progressEl = document.querySelector("[data-wpsc-installer-progress]");
const diagnosticsEl = document.querySelector("[data-wpsc-installer-diagnostics]");
const form = document.querySelector("[data-wpsc-installer-form]");
const submitButton = form.querySelector("button[type='submit']");

function renderState(payload) {
  const state = payload.state || {};
  stateEl.textContent = state.step || "START";
  progressEl.value = state.progress?.percent || 0;
  progressEl.nextElementSibling.textContent = String(state.progress?.percent || 0) + "%";
  diagnosticsEl.innerHTML = "";

  for (const warning of state.diagnostics?.warnings || []) {
    diagnosticsEl.insertAdjacentHTML("beforeend", "<li class=\\"warning\\">" + warning.message + "</li>");
  }

  for (const error of state.diagnostics?.errors || []) {
    diagnosticsEl.insertAdjacentHTML("beforeend", "<li class=\\"error\\">" + error.message + "</li>");
  }
}

function renderError(error) {
  diagnosticsEl.insertAdjacentHTML("beforeend", "<li class=\\"error\\">" + (error.message || "Installation failed.") + "</li>");
}

async function postJson(path, body) {
  const response = await fetch(apiBase + path, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json();

  if (!response.ok || payload.ok === false) {
    const message = payload.error?.message || payload.state?.diagnostics?.errors?.[0]?.message || "Installer request failed.";
    throw new Error(message);
  }

  return payload;
}

async function runInstall(payload) {
  const start = await postJson("/start", payload);
  renderState(start);

  const sessionId = start.state?.id;
  if (!sessionId) {
    throw new Error("Installer session was not created.");
  }

  for (const path of ["/check", "/config", "/build"]) {
    const result = await postJson(path, { sessionId });
    renderState(result);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  submitButton.disabled = true;
  submitButton.textContent = "Installing...";
  diagnosticsEl.innerHTML = "";

  try {
    await runInstall(payload);
  } catch (error) {
    renderError(error);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Start installation";
  }
});
`;
}

function createInstallerStyles() {
  return `:root {
  color-scheme: light;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 13pt;
}

body {
  margin: 0;
  background: #f4f7f6;
  color: #15352d;
}

.wpsc-installer {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(280px, 420px) 1fr;
}

.wpsc-installer__sidebar {
  background: #0c6349;
  color: #fff;
  padding: 40px;
}

.wpsc-installer__main {
  padding: 40px;
}

.wpsc-installer__panel {
  max-width: 860px;
  background: #fff;
  border: 1px solid #d9e5e1;
  border-radius: 8px;
  padding: 28px;
}

.wpsc-installer label {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}

.wpsc-installer input {
  border: 1px solid #b8cbc5;
  border-radius: 0;
  font: inherit;
  padding: 12px;
}

.wpsc-installer button {
  border: 0;
  border-radius: 0;
  background: #0c6349;
  color: #fff;
  cursor: pointer;
  font: inherit;
  padding: 12px 18px;
}

.wpsc-installer progress {
  width: 100%;
  height: 14px;
}

.wpsc-installer .warning {
  color: #946200;
}

.wpsc-installer .error {
  color: #b42318;
}

@media (max-width: 800px) {
  .wpsc-installer {
    grid-template-columns: 1fr;
  }
}
`;
}

export default function createWebInstallerUi(options = {}) {
  const title = options.title || "WPSC Installer";
  const apiBase = options.apiBase || "/api/install";

  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>${createInstallerStyles()}</style>
</head>
<body>
  <main class="wpsc-installer" data-wpsc-installer data-api-base="${escapeHtml(apiBase)}">
    <aside class="wpsc-installer__sidebar">
      <h1>${escapeHtml(title)}</h1>
      <p>Browser installation experience powered by the WPSC Execution Platform.</p>
      <p>State: <strong data-wpsc-installer-state>START</strong></p>
      <progress data-wpsc-installer-progress max="100" value="0"></progress>
      <span>0%</span>
    </aside>
    <section class="wpsc-installer__main">
      <div class="wpsc-installer__panel">
        <form data-wpsc-installer-form>
          <label>
            Site domain
            <input name="domain" type="url" placeholder="https://example.com">
          </label>
          <label>
            WordPress API URL
            <input name="wordpressUrl" type="url" placeholder="https://api.example.com">
          </label>
          <label>
            Site name
            <input name="siteName" type="text" placeholder="My WPSC Site">
          </label>
          <button type="submit">Start installation</button>
        </form>
        <ul data-wpsc-installer-diagnostics></ul>
      </div>
    </section>
  </main>
  <script>${createInstallerScript({ apiBase })}</script>
</body>
</html>
`;

  return {
    apiBase,
    assets: {
      css: createInstallerStyles(),
      js: createInstallerScript({ apiBase })
    },
    html,
    title,
    version: WEB_INSTALLER_UI_VERSION
  };
}
