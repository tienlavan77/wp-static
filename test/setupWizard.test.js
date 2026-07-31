import assert from "node:assert/strict";
import test from "node:test";
import createSetupWizard, {
  BROWSER_SETUP_WIZARD_VERSION
} from "../framework/src/browser/createSetupWizard.js";

test("createSetupWizard renders a REST-driven browser shell", () => {
  const wizard = createSetupWizard({ apiBase: "/api/setup/" });

  assert.equal(wizard.version, BROWSER_SETUP_WIZARD_VERSION);
  assert.match(wizard.html, /data-wpsc-setup-wizard/);
  assert.match(wizard.html, /data-api-base="\/api\/setup"/);
  assert.match(wizard.html, /data-setup-start-form/);
  assert.match(wizard.assets.css, /wpsc-setup__card/);
  assert.match(wizard.assets.js, /fetch\(apiBase\+path/);
  assert.match(wizard.assets.js, /renderDiagnostics/);
  assert.match(wizard.assets.js, /refreshState/);
  assert.equal(wizard.assets.js.includes("READY"), false);
  assert.equal(wizard.assets.js.includes("FAILED"), false);
  assert.equal(wizard.assets.js.includes("nextState"), false);
  assert.equal(wizard.assets.js.includes("transition"), false);
});
