import http from "node:http";

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json", "x-wp-totalpages": "1" });
  res.end(JSON.stringify(body));
}

export default async function createWooCommerceRestFixture(options = {}) {
  const consumerKey = options.consumerKey || "ck_fixture";
  const consumerSecret = options.consumerSecret || "cs_fixture";
  const state = options.state || {
    categories: [{ count: 1, id: 7, name: "Featured", slug: "featured" }],
    products: [{ categories: [{ id: 7, name: "Featured", slug: "featured" }], id: 101, images: [], name: "Product A", price: "100", slug: "product-a", status: "publish", tags: [], variations: [301, 302] }],
    variations: { 101: [{ attributes: [{ name: "Color", option: "Red" }], id: 301, price: "100", sku: "A-RED", stock_status: "instock" }, { attributes: [{ name: "Color", option: "Blue" }], id: 302, price: "100", sku: "A-BLUE", stock_status: "instock" }] }
  };
  const requests = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://fixture.local");
    requests.push({ key: url.searchParams.get("consumer_key"), secret: url.searchParams.get("consumer_secret"), url: req.url });
    if (url.searchParams.get("consumer_key") !== consumerKey || url.searchParams.get("consumer_secret") !== consumerSecret) return send(res, 401, { code: "woocommerce_rest_authentication_error", message: "Invalid WooCommerce keys" });
    const match = url.pathname.match(/\/wp-json\/wc\/v3\/products\/(\d+)\/variations$/);
    if (match) return send(res, 200, state.variations[match[1]] || []);
    if (url.pathname.endsWith("/products/categories")) return send(res, 200, state.categories);
    if (url.pathname.endsWith("/products/tags") || url.pathname.endsWith("/products/attributes") || url.pathname.endsWith("/settings/general")) return send(res, 200, []);
    if (url.pathname.endsWith("/products")) return send(res, 200, state.products);
    return send(res, 404, { code: "rest_no_route" });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return Object.freeze({ baseUrl: `http://127.0.0.1:${server.address().port}`, requests, state, async close() { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); } });
}
