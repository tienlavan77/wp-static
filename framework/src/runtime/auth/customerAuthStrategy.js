export const CUSTOMER_AUTH_MODES = Object.freeze({
  CUSTOM_BACKEND: "custom-backend",
  HEADLESS_WOOCOMMERCE: "headless-woocommerce",
  NO_LOGIN: "no-login"
});

export const CUSTOMER_AUTH_BOUNDARY = Object.freeze({
  staticCore: "renders public HTML and public data only",
  runtimeApi: "owns customer sessions, cookies, tokens, cart, checkout, and account data"
});

export const FORBIDDEN_FRONTEND_SECRETS = Object.freeze([
  "WPSC_WOO_CONSUMER_SECRET",
  "WPSC_WP_APP_PASSWORD",
  "WPSC_WP_BEARER_TOKEN",
  "JWT_SIGNING_SECRET",
  "SESSION_SECRET"
]);

export function validateCustomerAuthMode(mode) {
  if (!Object.values(CUSTOMER_AUTH_MODES).includes(mode)) {
    throw new Error(`Unsupported customer auth mode "${mode}".`);
  }

  return mode;
}

export function assertNoFrontendSecrets(publicEnv = {}) {
  const leakedSecret = FORBIDDEN_FRONTEND_SECRETS.find((secretName) => publicEnv[secretName]);

  if (leakedSecret) {
    throw new Error(`Secret "${leakedSecret}" must not be exposed to frontend code.`);
  }
}
