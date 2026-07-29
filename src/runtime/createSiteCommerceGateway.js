import createCommerceRuntime from "./commerce/createCommerceRuntime.js";
import createWooCommerceAccountService from "./commerce/createWooCommerceAccountService.js";
import createWordPressAuthService from "./commerce/createWordPressAuthService.js";

function diagnostic(code, message) {
  return { code, message, severity: "error" };
}

function hasWooCredentials(credentials = {}) {
  return Boolean(credentials.woocommerceConsumerKey && credentials.woocommerceConsumerSecret);
}

export default function createSiteCommerceGateway(options = {}) {
  const credentialStore = options.credentialStore;
  const repository = options.repository;
  const environment = options.environment || process.env;
  const fetchImpl = options.fetchImpl;
  if (!credentialStore?.read || !repository?.readSourceMetadata) {
    throw new TypeError("Site Commerce Gateway requires Site Repository and Credential Store.");
  }
  const runtimes = new Map();

  async function runtimeFor(siteId) {
    if (runtimes.has(siteId)) return runtimes.get(siteId);
    const [credentials, source] = await Promise.all([
      credentialStore.read(siteId),
      repository.readSourceMetadata(siteId)
    ]);
    if (!hasWooCredentials(credentials)) {
      throw new Error("WooCommerce credentials are required before Account can load customer data.");
    }
    const auth = createWordPressAuthService({
      baseUrl: source.endpoint,
      bridgeSecret: environment.WPSC_AUTH_BRIDGE_SECRET,
      ...(fetchImpl ? { fetchImpl } : {})
    });
    const account = createWooCommerceAccountService({
      baseUrl: source.endpoint,
      consumerKey: credentials.woocommerceConsumerKey,
      consumerSecret: credentials.woocommerceConsumerSecret,
      ...(fetchImpl ? { fetchImpl } : {})
    });
    const runtime = createCommerceRuntime({
      accountAddressUpdate: account.accountAddressUpdate,
      accountLookup: account.accountLookup,
      accountOrderLookup: account.accountOrderLookup,
      accountPasswordChange: auth.accountPasswordChange,
      accountPasswordReset: auth.accountPasswordReset,
      accountProfileUpdate: account.accountProfileUpdate,
      authLogin: auth.authLogin,
      authPasswordResetConfirm: auth.authPasswordResetConfirm,
      authRegister: auth.authRegister,
      authResendVerification: auth.authResendVerification,
      authVerifyEmail: auth.authVerifyEmail
    });
    runtimes.set(siteId, runtime);
    return runtime;
  }

  async function handle(siteId, request = {}) {
    try {
      const method = String(request.method || "GET").toUpperCase();
      const body = method === "GET" || method === "HEAD" ? undefined : JSON.stringify(request.body || {});
      const response = await (await runtimeFor(siteId)).handle(new Request(`http://runtime.local${request.path || "/api"}`, {
        body,
        headers: request.headers || {},
        method
      }));
      const text = await response.text();
      let parsed = {};
      try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
      return { body: parsed, headers: Object.fromEntries(response.headers.entries()), status: response.status };
    } catch (error) {
      return {
        body: { diagnostics: { errors: [diagnostic("runtime.account.unavailable", error.message)], warnings: [] }, ok: false },
        status: 503
      };
    }
  }

  return Object.freeze({ handle });
}
