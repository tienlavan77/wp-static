export default function normalizeApiPath(pathname) {
  if (pathname === "/api") {
    return "/";
  }

  return pathname.startsWith("/api/") ? pathname.slice(4) : pathname;
}
