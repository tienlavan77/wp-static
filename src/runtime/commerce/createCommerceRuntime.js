import handleAccountRoutes from "../account/handleAccountRoutes.js";
import {
  defaultAccountAddressUpdate,
  defaultAccountLookup,
  defaultAccountOrderLookup,
  defaultAccountPasswordChange,
  defaultAccountPasswordReset,
  defaultAccountProfileUpdate
} from "../account/defaultAccountHandlers.js";
import normalizeApiPath from "../api/normalizeApiPath.js";
import { json } from "../api/runtimeResponse.js";
import handleAuthRoutes from "../auth/handleAuthRoutes.js";
import {
  defaultAuthLogin,
  defaultAuthLogout,
  defaultAuthPasswordResetConfirm,
  defaultAuthRegister,
  defaultAuthResendVerification,
  defaultAuthVerifyEmail
} from "../auth/defaultAuthHandlers.js";
import handleCartRoutes from "../cart/handleCartRoutes.js";
import handleCheckoutRoutes from "../checkout/handleCheckoutRoutes.js";
import { defaultCheckoutProxy } from "../checkout/defaultCheckoutHandlers.js";
import createSessionStore from "./createSessionStore.js";
import handleOrderRoutes from "../order/handleOrderRoutes.js";
import { defaultOrderLookup } from "../order/defaultOrderHandlers.js";
import resolveCustomerSession from "./sessionMiddleware.js";

export default function createCommerceRuntime(options = {}) {
  const sessionStore = options.sessionStore ?? createSessionStore();
  const context = {
    accountAddressUpdate: options.accountAddressUpdate ?? defaultAccountAddressUpdate,
    accountLookup: options.accountLookup ?? defaultAccountLookup,
    accountOrderLookup: options.accountOrderLookup ?? defaultAccountOrderLookup,
    accountPasswordChange: options.accountPasswordChange ?? defaultAccountPasswordChange,
    accountPasswordReset: options.accountPasswordReset ?? defaultAccountPasswordReset,
    accountProfileUpdate: options.accountProfileUpdate ?? defaultAccountProfileUpdate,
    authLogin: options.authLogin ?? defaultAuthLogin,
    authLogout: options.authLogout ?? defaultAuthLogout,
    authPasswordResetConfirm: options.authPasswordResetConfirm ?? defaultAuthPasswordResetConfirm,
    authRegister: options.authRegister ?? defaultAuthRegister,
    authResendVerification: options.authResendVerification ?? defaultAuthResendVerification,
    authVerifyEmail: options.authVerifyEmail ?? defaultAuthVerifyEmail,
    checkoutProxy: options.checkoutProxy ?? defaultCheckoutProxy,
    orderLookup: options.orderLookup ?? defaultOrderLookup,
    sessionStore
  };

  return {
    async handle(request) {
      return handleCommerceRequest(request, context);
    },
    sessionStore
  };
}

async function handleCommerceRequest(request, baseContext) {
  const url = new URL(request.url);
  const pathname = normalizeApiPath(url.pathname);
  const { cookieHeader, session } = resolveCustomerSession(request, baseContext.sessionStore);
  const headers = {
    "content-type": "application/json; charset=utf-8"
  };
  const context = {
    ...baseContext,
    headers,
    request,
    session
  };

  if (cookieHeader) {
    headers["set-cookie"] = cookieHeader;
  }

  if (pathname === "/health" && request.method === "GET") {
    return json({ ok: true }, { headers });
  }

  return await handleAuthRoutes(pathname, request, context)
    ?? await handleAccountRoutes(pathname, request, context)
    ?? await handleCartRoutes(pathname, request, context)
    ?? await handleCheckoutRoutes(pathname, request, context)
    ?? await handleOrderRoutes(pathname, request, context)
    ?? json({ error: "Not found" }, { headers, status: 404 });
}
