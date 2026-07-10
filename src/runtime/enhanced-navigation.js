(function () {
  var mainSelector = "main";

  if (!window.fetch || !window.history || !document.querySelector(mainSelector)) {
    return;
  }

  function routeDataUrl(pathname) {
    var slug = pathname.replace(/^\/+|\/+$/g, "").replaceAll("/", "__");
    return "/data/routes/" + (slug || "index") + ".json";
  }

  function sameOriginLink(link) {
    return link.origin === window.location.origin && !link.hash && !link.target && !link.hasAttribute("download");
  }

  function shouldHandle(link) {
    if (!sameOriginLink(link)) return false;
    if (link.pathname.startsWith("/admin")) return false;
    if (link.pathname.startsWith("/api")) return false;
    if (link.pathname.startsWith("/cart") || link.pathname.startsWith("/checkout")) return false;
    return true;
  }

  async function navigate(pathname, options) {
    var dataResponse = await fetch(routeDataUrl(pathname), { headers: { accept: "application/json" } });
    if (!dataResponse.ok) throw new Error("Route data not found");
    var data = await dataResponse.json();
    var fragmentUrl = data.runtime && data.runtime.fragmentUrl;
    if (!fragmentUrl) throw new Error("Route fragment missing");

    var fragmentResponse = await fetch(fragmentUrl, { headers: { accept: "text/html" } });
    if (!fragmentResponse.ok) throw new Error("Route fragment not found");
    var fragment = await fragmentResponse.text();
    var currentMain = document.querySelector(mainSelector);
    if (!currentMain) throw new Error("Main element missing");

    currentMain.outerHTML = fragment;
    if (data.seo && data.seo.title) {
      document.title = data.seo.title;
    } else if (data.content && data.content.title) {
      document.title = data.content.title;
    }

    if (!options || options.push !== false) {
      window.history.pushState({ wpsc: true, path: pathname }, "", pathname);
    }

    window.dispatchEvent(new CustomEvent("wpsc:navigation", { detail: data }));
    window.scrollTo(0, 0);
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest("a[href]");
    if (!link || !shouldHandle(link)) return;

    event.preventDefault();
    navigate(link.pathname).catch(function () {
      window.location.href = link.href;
    });
  });

  window.addEventListener("popstate", function () {
    navigate(window.location.pathname, { push: false }).catch(function () {
      window.location.reload();
    });
  });
}());
