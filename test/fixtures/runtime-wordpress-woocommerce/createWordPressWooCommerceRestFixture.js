import http from "node:http";

const FIXTURE_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL5WQAAAABJRU5ErkJggg==", "base64");

function send(response, status, body) {
  response.writeHead(status, { "content-type": "application/json", "x-wp-totalpages": "1" });
  response.end(JSON.stringify(body));
}

function isWooCommercePath(pathname) {
  return pathname.startsWith("/wp-json/wc/v3/");
}

export default async function createWordPressWooCommerceRestFixture(options = {}) {
  const username = options.username || "fixture-user";
  const applicationPassword = options.applicationPassword || "fixture-app-password";
  const consumerKey = options.consumerKey || "ck_fixture";
  const consumerSecret = options.consumerSecret || "cs_fixture";
  const state = options.state || {
    categories: [{ count: 1, id: 7, name: "Featured", slug: "featured" }],
    media: [], pages: [{ content: { rendered: "<p>Welcome</p>" }, excerpt: { rendered: "" }, id: 1, slug: "homepage", title: { rendered: "Home" } }], posts: [], tags: [], users: [],
    // The Storefront homepage renders child categories; a non-root parent
    // makes this fixture a real embedded Product-card consumer.
    productCategories: [{ count: 1, id: 7, name: "Featured", parent: 9, slug: "featured" }],
    products: [{ categories: [{ id: 7, name: "Featured", parent: 9, slug: "featured" }], id: 101, images: [], name: "Product A", price: "100", slug: "product-a", status: "publish", tags: [], variations: [301, 302] }],
    variations: { 101: [{ attributes: [{ name: "Color", option: "Red" }], id: 301, price: "100", sku: "A-RED", stock_status: "instock" }, { attributes: [{ name: "Color", option: "Blue" }], id: 302, price: "100", sku: "A-BLUE", stock_status: "instock" }] }
  };
  const requests = [];
  const expectedAuthorization = `Basic ${Buffer.from(`${username}:${applicationPassword}`).toString("base64")}`;
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://fixture.local");
    if (url.pathname.startsWith("/media/")) {
      response.writeHead(200, { "content-type": "image/png" });
      response.end(FIXTURE_PNG);
      return;
    }
    const woo = isWooCommercePath(url.pathname);
    requests.push({ authorization: request.headers.authorization || null, key: url.searchParams.get("consumer_key"), secret: url.searchParams.get("consumer_secret"), url: request.url, woo });
    if (woo) {
      if (url.searchParams.get("consumer_key") !== consumerKey || url.searchParams.get("consumer_secret") !== consumerSecret) {
        return send(response, 401, { code: "woocommerce_rest_authentication_error", message: "Invalid WooCommerce keys" });
      }
      if (state.failNextWoo === true) {
        state.failNextWoo = false;
        return send(response, 503, { code: "fixture_woocommerce_unavailable", message: "Controlled WooCommerce fixture failure" });
      }
      const variation = url.pathname.match(/\/wp-json\/wc\/v3\/products\/(\d+)\/variations$/);
      if (variation) return send(response, 200, state.variations[variation[1]] || []);
      if (url.pathname.endsWith("/products/categories")) return send(response, 200, state.productCategories);
      if (url.pathname.endsWith("/products/tags") || url.pathname.endsWith("/products/attributes") || url.pathname.endsWith("/settings/general")) return send(response, 200, []);
      if (url.pathname.endsWith("/products")) return send(response, 200, state.products);
      return send(response, 404, { code: "rest_no_route" });
    }
    if (request.headers.authorization !== expectedAuthorization) return send(response, 401, { code: "rest_not_logged_in", message: "Invalid application password" });
    const key = url.pathname.split("/").filter(Boolean).at(-1);
    const values = { categories: state.categories, media: state.media, menus: state.menus || [], pages: state.pages, posts: state.posts, tags: state.tags, users: state.users };
    return send(response, 200, values[key] || []);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return Object.freeze({
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    consumerKey,
    consumerSecret,
    requests,
    state,
    username,
    applicationPassword,
    async close() { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
  });
}
