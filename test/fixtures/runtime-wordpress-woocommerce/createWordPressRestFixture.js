import http from "node:http";

function response(res, status, body) {
  res.writeHead(status, { "content-type": "application/json", "x-wp-totalpages": "1" });
  res.end(JSON.stringify(body));
}

export default async function createWordPressRestFixture(options = {}) {
  const username = options.username || "fixture-user";
  const applicationPassword = options.applicationPassword || "fixture-app-password";
  const state = options.state || {
    categories: [{ count: 1, id: 7, name: "Featured", slug: "featured" }],
    media: [{ alt_text: "Product A image", id: 21, media_details: { height: 600, sizes: {}, width: 800 }, mime_type: "image/jpeg", source_url: "https://cdn.fixture.test/product-a.jpg" }],
    pages: [], posts: [], tags: [], users: []
  };
  const requests = [];
  const expected = `Basic ${Buffer.from(`${username}:${applicationPassword}`).toString("base64")}`;
  const server = http.createServer((req, res) => {
    requests.push({ authorization: req.headers.authorization || null, url: req.url });
    if (req.headers.authorization !== expected) return response(res, 401, { code: "rest_not_logged_in", message: "Invalid application password" });
    const path = new URL(req.url, "http://fixture.local").pathname;
    const key = path.split("/").filter(Boolean).at(-1);
    const values = { categories: state.categories, media: state.media, menus: state.menus || [], posts: state.posts, pages: state.pages, tags: state.tags, users: state.users };
    return response(res, 200, values[key] || []);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return Object.freeze({
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests,
    state,
    async close() { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
  });
}
