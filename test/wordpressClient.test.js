import assert from "node:assert/strict";
import test from "node:test";
import createWordPressClient from "../src/adapters/wordpress/wordpressClient.js";

test("WordPress client fetches paginated collections", async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(String(url));
    const page = new URL(String(url)).searchParams.get("page");

    return {
      ok: true,
      headers: new Headers({
        "x-wp-totalpages": "2"
      }),
      async json() {
        return [{ id: Number(page) }];
      }
    };
  };
  const client = createWordPressClient({
    baseUrl: "https://example.com",
    fetchImpl
  });
  const items = await client.getCollection("/wp-json/wp/v2/pages");

  assert.deepEqual(items, [{ id: 1 }, { id: 2 }]);
  assert.equal(urls.length, 2);
  assert.match(urls[0], /per_page=100/);
});
