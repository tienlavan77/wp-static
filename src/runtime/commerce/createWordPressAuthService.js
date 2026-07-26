import { AdapterError } from "../../shared/errors.js";

export default function createWordPressAuthService(options = {}) {
  if (typeof options.baseUrl !== "string" || options.baseUrl.trim() === "") {
    throw new AdapterError('WordPress auth service option "baseUrl" is required.');
  }

  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const endpoint = options.endpoint ?? "/wp-json/wpsc/v1/auth/login";
  const lostPasswordEndpoint = options.lostPasswordEndpoint ?? "/wp-json/wpsc/v1/auth/lost-password";
  const registerEndpoint = options.registerEndpoint ?? "/wp-json/wpsc/v1/auth/register";
  const resetPasswordEndpoint = options.resetPasswordEndpoint ?? "/wp-json/wpsc/v1/auth/reset-password";
  const changePasswordEndpoint = options.changePasswordEndpoint ?? "/wp-json/wpsc/v1/auth/change-password";
  const verifyEmailEndpoint = options.verifyEmailEndpoint ?? "/wp-json/wpsc/v1/auth/verify-email";
  const resendVerificationEndpoint = options.resendVerificationEndpoint ?? "/wp-json/wpsc/v1/auth/resend-verification";
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const bridgeSecret = options.bridgeSecret ?? options.env?.WPSC_AUTH_BRIDGE_SECRET ?? process.env.WPSC_AUTH_BRIDGE_SECRET ?? "";

  if (typeof fetchImpl !== "function") {
    throw new AdapterError("WordPress auth service requires a fetch implementation.");
  }

  return {
    async authLogin({ credentials }) {
      const username = String(credentials?.username ?? "").trim();
      const password = String(credentials?.password ?? "");

      if (!username || !password) {
        return {
          error: "Username and password are required.",
          status: 400
        };
      }

      const response = await fetchImpl(`${baseUrl}${endpoint}`, {
        body: JSON.stringify({
          password,
          username
        }),
        headers: createJsonHeaders(bridgeSecret),
        method: "POST"
      });
      const payload = await readJsonResponse(response);

      if (!response.ok) {
        return {
          error: payload?.message ?? payload?.error ?? "Login failed.",
          status: response.status
        };
      }

      return {
        user: normalizeAuthUser(payload?.user ?? payload?.customer ?? payload)
      };
    },

    async accountPasswordReset({ payload }) {
      const username = String(payload?.username ?? payload?.email ?? "").trim();

      if (!username) {
        return {
          error: "Email or username is required.",
          status: 400
        };
      }

      const response = await fetchImpl(`${baseUrl}${lostPasswordEndpoint}`, {
        body: JSON.stringify({ username }),
        headers: createJsonHeaders(bridgeSecret),
        method: "POST"
      });
      const body = await readJsonResponse(response);

      return response.ok
        ? { ok: true, message: body?.message ?? "Password reset email sent." }
        : { error: body?.message ?? body?.error ?? "Password reset failed.", status: response.status };
    },

    async authRegister({ payload }) {
      return postBridge(fetchImpl, `${baseUrl}${registerEndpoint}`, bridgeSecret, {
        email: String(payload?.email ?? "").trim(),
        firstName: String(payload?.firstName ?? "").trim(),
        lastName: String(payload?.lastName ?? "").trim(),
        password: String(payload?.password ?? ""),
        phone: String(payload?.phone ?? "").trim()
      }, "Register failed.");
    },

    async accountPasswordChange({ payload, userId }) {
      return postBridge(fetchImpl, `${baseUrl}${changePasswordEndpoint}`, bridgeSecret, {
        currentPassword: String(payload?.currentPassword ?? ""),
        newPassword: String(payload?.newPassword ?? ""),
        userId
      }, "Password change failed.");
    },

    async authPasswordResetConfirm({ payload }) {
      return postBridge(fetchImpl, `${baseUrl}${resetPasswordEndpoint}`, bridgeSecret, {
        login: String(payload?.login ?? ""),
        password: String(payload?.password ?? ""),
        token: String(payload?.token ?? "")
      }, "Password reset failed.");
    },

    async authVerifyEmail({ payload }) {
      return postBridge(fetchImpl, `${baseUrl}${verifyEmailEndpoint}`, bridgeSecret, {
        login: String(payload?.login ?? ""),
        token: String(payload?.token ?? "")
      }, "Email verification failed.");
    },

    async authResendVerification({ payload }) {
      return postBridge(fetchImpl, `${baseUrl}${resendVerificationEndpoint}`, bridgeSecret, {
        email: String(payload?.email ?? "").trim()
      }, "Verification email failed.");
    }
  };
}

async function postBridge(fetchImpl, url, bridgeSecret, payload, fallbackError) {
  const response = await fetchImpl(url, {
    body: JSON.stringify(payload),
    headers: createJsonHeaders(bridgeSecret),
    method: "POST"
  });
  const body = await readJsonResponse(response);

  if (!response.ok) {
    return {
      error: body?.message ?? body?.error ?? fallbackError,
      status: response.status
    };
  }

  return {
    ...body,
    user: body?.user ? normalizeAuthUser(body.user) : undefined,
    status: response.status
  };
}

function createJsonHeaders(bridgeSecret) {
  return {
    accept: "application/json",
    "content-type": "application/json",
    ...(bridgeSecret ? { "x-wpsc-bridge-secret": bridgeSecret } : {})
  };
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function normalizeAuthUser(user = {}) {
  const id = user.id ?? user.ID ?? user.user_id ?? user.customer_id;

  if (!id) {
    throw new AdapterError("WordPress auth response must include user.id.");
  }

  return {
    displayName: user.displayName ?? user.display_name ?? user.name ?? user.username ?? user.email ?? "",
    email: user.email ?? user.user_email ?? "",
    emailVerified: user.emailVerified ?? user.email_verified ?? false,
    id,
    roles: Array.isArray(user.roles) ? user.roles : []
  };
}
