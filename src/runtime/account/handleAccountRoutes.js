import { clearCustomerSessionCookie } from "../session/index.js";
import { json, readJson, responseStatus } from "../api/runtimeResponse.js";
import { normalizeSessionUser } from "../auth/sessionUser.js";
import normalizeAccountPayload from "./normalizeAccountPayload.js";

export default async function handleAccountRoutes(pathname, request, context) {
  const { headers, session } = context;

  if (pathname === "/account/password-reset" && request.method === "POST") {
    const payload = await readJson(request);
    const result = await context.accountPasswordReset({
      payload,
      request,
      session
    });

    return json(result, { headers, status: responseStatus(result) });
  }

  if (pathname === "/account/me" && request.method === "GET") {
    if (!session.user?.id) {
      return json({
        authenticated: false,
        user: null
      }, { headers });
    }

    let account;

    try {
      account = await context.accountLookup({
        request,
        session,
        userId: session.user.id
      });
    } catch {
      account = {
        addresses: {},
        orders: [],
        warning: "Account data is temporarily unavailable."
      };
    }

    if (responseStatus(account) >= 400) {
      return json(account, { headers, status: account.status });
    }

    return json(normalizeAccountPayload(account, session.user), { headers });
  }

  if (pathname.startsWith("/account/orders/") && request.method === "GET") {
    if (!session.user?.id) {
      return json({ error: "Authentication required." }, { headers, status: 401 });
    }

    const orderId = decodeURIComponent(pathname.replace("/account/orders/", ""));
    let order;

    try {
      order = await context.accountOrderLookup({
        orderId,
        request,
        session,
        userId: session.user.id
      });
    } catch {
      order = {
        error: "Order not found.",
        status: 404
      };
    }

    return json(order, { headers, status: responseStatus(order) });
  }

  if (pathname === "/account/addresses" && request.method === "POST") {
    if (!session.user?.id) {
      return json({ error: "Authentication required." }, { headers, status: 401 });
    }

    const result = await context.accountAddressUpdate({
      payload: await readJson(request),
      request,
      session,
      userId: session.user.id
    });

    return json(result, { headers, status: responseStatus(result) });
  }

  if (pathname === "/account/profile" && request.method === "POST") {
    if (!session.user?.id) {
      return json({ error: "Authentication required." }, { headers, status: 401 });
    }

    const result = await context.accountProfileUpdate({
      payload: await readJson(request),
      request,
      session,
      userId: session.user.id
    });

    if (result.user) {
      session.user = normalizeSessionUser({
        ...session.user,
        ...result.user
      });
    }

    return json(result, { headers, status: responseStatus(result) });
  }

  if (pathname === "/account/change-password" && request.method === "POST") {
    if (!session.user?.id) {
      return json({ error: "Authentication required." }, { headers, status: 401 });
    }

    const result = await context.accountPasswordChange({
      payload: await readJson(request),
      request,
      session,
      userId: session.user.id
    });

    if (result?.ok) {
      context.sessionStore.destroy(session.id);
      return json(result, {
        headers: {
          ...headers,
          "set-cookie": clearCustomerSessionCookie()
        },
        status: responseStatus(result)
      });
    }

    return json(result, { headers, status: responseStatus(result) });
  }

  return null;
}
