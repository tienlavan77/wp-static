const SESSION_COOKIE = "wpsc_session";

export default function resolveCustomerSession(request, sessionStore) {
  const sessionId = readCookie(request.headers.get("cookie") ?? "", SESSION_COOKIE);
  const session = sessionStore.getOrCreate(sessionId);
  const shouldSetCookie = session.id !== sessionId;

  return {
    cookieHeader: shouldSetCookie
      ? `${SESSION_COOKIE}=${session.id}; Path=/; HttpOnly; SameSite=Lax`
      : null,
    session
  };
}

export function clearCustomerSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function readCookie(cookieHeader, name) {
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const prefix = `${name}=`;
  const match = cookies.find((cookie) => cookie.startsWith(prefix));

  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}
