export function routeDataUrl(pathname) {
  var normalized = normalizeNavigationPath(pathname);

  return normalized === "/"
    ? "/data/routes/index.json"
    : "/data/routes/" + normalized.replace(/^\/+/, "").replace(/\//g, "__") + ".json";
}

export function normalizeNavigationPath(pathname) {
  var normalized = String(pathname || "/").replace(/\/+$/, "");
  return normalized || "/";
}

export function sameOriginLink(link) {
  return link.origin === window.location.origin;
}
