import createWebInstallerUi from "../installer/createWebInstallerUi.js";
import createInstallationConfigGenerator from "../installer/createInstallationConfigGenerator.js";
import createWizardApi from "../installer/createWizardApi.js";
import persistInstallationConfiguration from "./persistInstallationConfiguration.js";

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

function redirectResponse(location) {
  return {
    body: "",
    headers: {
      location
    },
    status: 303
  };
}

function normalizePath(pathname) {
  const value = String(pathname || "/").split("?")[0].replace(/\/+$/, "");
  return value || "/";
}

function methodIs(request, method) {
  return String(request.method || "GET").toUpperCase() === method;
}

function alreadyInstalledHtml(lock = {}) {
  const installedAt = lock.installedAt
    ? `<p>Installed at: <code>${lock.installedAt}</code></p>`
    : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>WPSC Already Installed</title>
  </head>
  <body data-wpsc-already-installed>
    <main>
      <h1>WPSC is already installed</h1>
      <p>The installer is locked to protect the production website.</p>
      ${installedAt}
    </main>
  </body>
</html>`;
}

async function runDefaultInstallExecutor({
  body,
  configurationGenerator,
  installationLock,
  persistConfiguration,
  productionBuild,
  releaseDir,
  wizard
}) {
  const sessionId = body.sessionId;
  const validate = wizard.transition(sessionId, "VALIDATE", {
    reason: "http-install-validate"
  });

  if (!validate.ok) {
    return validate;
  }

  const build = wizard.transition(sessionId, "BUILD", {
    reason: "http-install-build"
  });

  if (!build.ok) {
    return build;
  }

  try {
    const input = build.state.input || {};
    const configuration = configurationGenerator({
      ...input,
      mode: "production",
      outputDir: "public",
      projectDir: releaseDir,
      woocommerceUrl: input.woocommerceUrl || input.wordpressUrl
    });
    const persistedConfiguration = await persistConfiguration({
      configuration,
      releaseDir
    });
    const production = productionBuild
      ? await productionBuild.run(persistedConfiguration, {
        projectDir: releaseDir
      })
      : {
        build: {
          skipped: true,
          reason: "No production build runner was configured."
        },
        ok: true
      };

    if (production.ok === false) {
      return wizard.fail(
        sessionId,
        "install.production_build.failed",
        production.diagnostics?.errors?.[0]?.message || "Production build failed.",
        production
      );
    }

    const lock = installationLock
      ? await installationLock.create({
        build: production.build || null,
        source: "http-installer"
      })
      : null;

    return wizard.finish(sessionId, {
      lock,
      persistedConfiguration,
      production,
      reason: "http-install-finished"
    });
  } catch (error) {
    return wizard.fail(sessionId, "install.executor.failed", error.message, {
      message: error.message
    });
  }
}

export default function createHttpInstaller(options = {}) {
  const wizard = options.wizardApi || createWizardApi();
  const installationLock = options.installationLock || null;
  const releaseDir = options.releaseDir || process.cwd();
  const configurationGenerator = options.configurationGenerator || createInstallationConfigGenerator;
  const persistConfiguration = options.persistConfiguration || persistInstallationConfiguration;
  const productionBuild = options.productionBuild || null;
  const installExecutor = options.installExecutor || runDefaultInstallExecutor;
  let report = options.report || null;
  const ui = options.ui || createWebInstallerUi({
    apiBase: "/install"
  });

  async function handle(request = {}) {
    const pathname = normalizePath(request.path || request.url || "/");

    if (installationLock && pathname.startsWith("/install") && pathname !== "/install/already-installed") {
      const lock = await installationLock.read();
      if (lock.installed) {
        if (methodIs(request, "GET") && pathname === "/install") {
          return redirectResponse("/install/already-installed");
        }
        return jsonResponse(409, {
          error: {
            code: lock.corrupt ? "install.lock.corrupt" : "install.lock.exists",
            lockPath: lock.lockPath,
            message: lock.corrupt
              ? "Installation lock file is corrupt. Recover the installation before running installer again."
              : "WPSC is already installed."
          },
          lock,
          ok: false
        });
      }
    }

    if (methodIs(request, "GET") && pathname === "/install") {
      return htmlResponse(200, ui.html);
    }

    if (methodIs(request, "GET") && pathname === "/install/already-installed") {
      const lock = installationLock ? await installationLock.read() : {};
      return htmlResponse(200, alreadyInstalledHtml(lock));
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
      const result = await installExecutor({
        body,
        configurationGenerator,
        installationLock,
        persistConfiguration,
        productionBuild,
        releaseDir,
        wizard
      });
      if (result.ok && result.state?.step === "FINISH") {
        report = result.state.result;
      }
      return jsonResponse(result.ok ? 200 : 500, result);
    }

    if (methodIs(request, "GET") && pathname === "/install/report") {
      return jsonResponse(200, {
        ok: true,
        report
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
      "GET /install/already-installed",
      "GET /install/report"
    ],
    version: HTTP_INSTALLER_VERSION,
    wizard
  };
}
