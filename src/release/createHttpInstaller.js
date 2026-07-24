import createWebInstallerUi from "../installer/createWebInstallerUi.js";
import createWizardApi from "../installer/createWizardApi.js";

export const HTTP_INSTALLER_VERSION = "1.0";

function jsonResponse(status, body) {
  return {
    body,
    headers: {
      "content-type": "application/json; charset=utf-8"
    },
    status
  };
}

function htmlResponse(status, body) {
  return {
    body,
    headers: {
      "content-type": "text/html; charset=utf-8"
    },
    status
  };
}

function normalizePath(pathname) {
  const value = String(pathname || "/").split("?")[0].replace(/\/+$/, "");
  return value || "/";
}

function methodIs(request, method) {
  return String(request.method || "GET").toUpperCase() === method;
}

export default function createHttpInstaller(options = {}) {
  const wizard = options.wizardApi || createWizardApi();
  const ui = options.ui || createWebInstallerUi({
    apiBase: "/install"
  });

  async function handle(request = {}) {
    const pathname = normalizePath(request.path || request.url || "/");

    if (methodIs(request, "GET") && pathname === "/install") {
      return htmlResponse(200, ui.html);
    }

    if (methodIs(request, "POST") && pathname === "/install/start") {
      return jsonResponse(200, wizard.create(request.body || {}));
    }

    if (methodIs(request, "POST") && pathname === "/install/check") {
      const body = request.body || {};
      return jsonResponse(200, wizard.transition(body.sessionId, "CHECK", {
        reason: "http-install-check"
      }));
    }

    if (methodIs(request, "POST") && pathname === "/install/config") {
      const body = request.body || {};
      return jsonResponse(200, wizard.transition(body.sessionId, "CONFIGURE", {
        reason: "http-install-config"
      }));
    }

    if (methodIs(request, "POST") && pathname === "/install/build") {
      const body = request.body || {};
      return jsonResponse(200, wizard.transition(body.sessionId, "VALIDATE", {
        reason: "http-install-validate"
      }));
    }

    if (methodIs(request, "GET") && pathname === "/install/report") {
      return jsonResponse(200, {
        ok: true,
        report: options.report || null
      });
    }

    return jsonResponse(404, {
      error: {
        code: "http.installer.not_found",
        message: `No installer route matches ${request.method || "GET"} ${pathname}.`
      },
      ok: false
    });
  }

  return {
    handle,
    routes: [
      "GET /install",
      "POST /install/start",
      "POST /install/check",
      "POST /install/config",
      "POST /install/build",
      "GET /install/report"
    ],
    version: HTTP_INSTALLER_VERSION,
    wizard
  };
}
