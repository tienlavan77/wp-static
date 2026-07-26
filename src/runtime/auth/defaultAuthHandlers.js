export function defaultAuthLogin() {
  return {
    error: "Auth login is not configured.",
    status: 501
  };
}

export function defaultAuthLogout() {
  return {
    ok: true
  };
}

export function defaultAuthRegister() {
  return {
    error: "Auth register is not configured.",
    status: 501
  };
}

export function defaultAuthPasswordResetConfirm() {
  return {
    error: "Auth password reset is not configured.",
    status: 501
  };
}

export function defaultAuthVerifyEmail() {
  return {
    error: "Auth email verification is not configured.",
    status: 501
  };
}

export function defaultAuthResendVerification() {
  return {
    error: "Auth resend verification is not configured.",
    status: 501
  };
}
