import { clearCustomerSessionCookie } from "../session/index.js";
import { isHttpErrorStatus, json, readJson, responseStatus } from "../api/runtimeResponse.js";
import { normalizeSessionUser } from "./sessionUser.js";
import createCustomerIdentity from "../account/createCustomerIdentity.js";

export default async function handleAuthRoutes(pathname, request, context) {
  const { headers, session } = context;

  if (pathname === "/auth/login" && request.method === "POST") {
    const credentials = await readJson(request);
    const login = await context.authLogin({
      credentials,
      request,
      session
    });

    if (isHttpErrorStatus(login?.status)) {
      return json(login, { headers, status: login.status });
    }

    session.user = normalizeSessionUser(login?.user ?? login?.customer ?? login?.account);
    session.authenticatedAt = new Date().toISOString();
    session.identity = createCustomerIdentity({
      authenticatedAt: session.authenticatedAt,
      siteId: context.siteId,
      user: session.user
    });

    return json({
      identity: session.identity,
      user: session.user,
      status: responseStatus(login)
    }, { headers });
  }

  if (pathname === "/auth/logout" && request.method === "POST") {
    await context.authLogout({
      request,
      session
    });

    context.sessionStore.destroy(session.id);

    return json({ ok: true }, {
      headers: {
        ...headers,
        "set-cookie": clearCustomerSessionCookie()
      }
    });
  }

  if (pathname === "/auth/register" && request.method === "POST") {
    const result = await context.authRegister({
      payload: await readJson(request),
      request,
      session
    });

    return json(result, { headers, status: responseStatus(result, 201) });
  }

  if (pathname === "/auth/reset-password" && request.method === "POST") {
    const result = await context.authPasswordResetConfirm({
      payload: await readJson(request),
      request,
      session
    });

    return json(result, { headers, status: responseStatus(result) });
  }

  if (pathname === "/auth/verify-email" && request.method === "POST") {
    const result = await context.authVerifyEmail({
      payload: await readJson(request),
      request,
      session
    });

    return json(result, { headers, status: responseStatus(result) });
  }

  if (pathname === "/auth/resend-verification" && request.method === "POST") {
    const result = await context.authResendVerification({
      payload: await readJson(request),
      request,
      session
    });

    return json(result, { headers, status: responseStatus(result) });
  }

  return null;
}
