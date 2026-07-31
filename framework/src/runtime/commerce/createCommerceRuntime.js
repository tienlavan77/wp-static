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
import createCartService from "../cart/createCartService.js";
import createCheckoutService from "../checkout/createCheckoutService.js";
import handleFormRoutes from "../forms/handleFormRoutes.js";
import createFormsService from "../../forms/createFormsService.js";
import createPerformanceService from "../../performance/createPerformanceService.js";

export default function createCommerceRuntime(options = {}) {
  const siteId = String(options.siteId ?? "default").trim();
  const sessionStore = options.sessionStore ?? createSessionStore({ siteId });
  const cartService = options.cartService ?? createCartService({ resolveItems: options.resolveCartItems, siteId });
  const checkoutService = options.checkoutService ?? createCheckoutService({
    siteId,
    submitProvider: options.checkoutProxy ?? defaultCheckoutProxy,
    syncCart(session, items) {
      cartService.clear(session);
      for (const item of items) {
        cartService.add(session, {
          productId: item.productId ?? item.id,
          quantity: item.quantity,
          variationId: item.variationId ?? item.variant?.id ?? null
        });
      }
    }
  });
  const formsService = options.formsService ?? createFormsService({ resolveForm: options.resolveForm, siteId, submitForm: options.submitForm });
  const performanceService = options.performanceService ?? createPerformanceService({ siteId });
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
    cartService,
    checkoutService,
    formsService,
    checkoutProxy: options.checkoutProxy ?? defaultCheckoutProxy,
    orderLookup: options.orderLookup ?? defaultOrderLookup,
    sessionStore,
    siteId
  };

  return {
    async handle(request) {
      const metric = classifyRuntimeRequest(request);
      return performanceService.measure(metric, () => handleCommerceRequest(request, context));
    },
    performance: performanceService,
    sessionStore
  };
}

function classifyRuntimeRequest(request) {
  const pathname = normalizeApiPath(new URL(request.url).pathname);
  if (pathname.startsWith("/checkout")) return { resource: request.method, service: "checkout" };
  if (pathname.startsWith("/forms/")) return { resource: request.method, service: "forms" };
  if (pathname.startsWith("/search")) return { resource: request.method, service: "search" };
  if (pathname.startsWith("/cart") || pathname.startsWith("/orders") || pathname.startsWith("/account")) return { resource: request.method, service: "commerce" };
  return { resource: request.method, service: "runtime" };
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
    ?? await handleFormRoutes(pathname, request, context)
    ?? await handleOrderRoutes(pathname, request, context)
    ?? json({ error: "Not found" }, { headers, status: 404 });
}
