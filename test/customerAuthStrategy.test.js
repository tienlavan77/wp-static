import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertNoFrontendSecrets,
  CUSTOMER_AUTH_BOUNDARY,
  CUSTOMER_AUTH_MODES,
  validateCustomerAuthMode
} from "../framework/src/runtime/auth/customerAuthStrategy.js";

test("customer auth strategy defines supported auth modes", () => {
  assert.equal(validateCustomerAuthMode(CUSTOMER_AUTH_MODES.NO_LOGIN), "no-login");
  assert.equal(validateCustomerAuthMode(CUSTOMER_AUTH_MODES.HEADLESS_WOOCOMMERCE), "headless-woocommerce");
  assert.equal(validateCustomerAuthMode(CUSTOMER_AUTH_MODES.CUSTOM_BACKEND), "custom-backend");
  assert.throws(() => validateCustomerAuthMode("static-session"), /Unsupported customer auth mode/);
});

test("customer auth boundary keeps sessions in runtime API", () => {
  assert.match(CUSTOMER_AUTH_BOUNDARY.staticCore, /public HTML/);
  assert.match(CUSTOMER_AUTH_BOUNDARY.runtimeApi, /customer sessions/);
});

test("customer auth contract blocks frontend secrets", () => {
  assert.doesNotThrow(() => assertNoFrontendSecrets({
    PUBLIC_SITE_URL: "https://example.com"
  }));
  assert.throws(
    () => assertNoFrontendSecrets({
      WPSC_WOO_CONSUMER_SECRET: "cs_secret"
    }),
    /must not be exposed/
  );
});

test("customer auth docs describe modes and token rules", async () => {
  const docs = await readFile("docs/customer-auth-strategy.md", "utf8");

  assert.match(docs, /No Login/);
  assert.match(docs, /Headless WooCommerce/);
  assert.match(docs, /Custom Backend/);
  assert.match(docs, /HTTP-only cookies/);
  assert.match(docs, /CSRF protection/);
  assert.match(docs, /WPSC_WOO_CONSUMER_SECRET/);
});
