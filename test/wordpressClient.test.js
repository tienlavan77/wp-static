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

test("WordPress client sends application password auth header", async () => {
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ init, url: String(url) });

    return {
      ok: true,
      headers: new Headers({
        "x-wp-totalpages": "1"
      }),
      async json() {
        return [];
      }
    };
  };
  const client = createWordPressClient({
    auth: {
      passwordEnv: "WP_APP_PASSWORD",
      type: "applicationPassword",
      usernameEnv: "WP_USER"
    },
    baseUrl: "https://example.com",
    env: {
      WP_APP_PASSWORD: "app-password",
      WP_USER: "editor"
    },
    fetchImpl
  });

  await client.getCollection("/wp-json/wp/v2/pages");

  assert.match(requests[0].init.headers.authorization, /^Basic /);
});

test("WordPress client sends bearer auth header", async () => {
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ init, url: String(url) });

    return {
      ok: true,
      headers: new Headers({
        "x-wp-totalpages": "1"
      }),
      async json() {
        return [];
      }
    };
  };
  const client = createWordPressClient({
    auth: {
      tokenEnv: "WP_TOKEN",
      type: "bearer"
    },
    baseUrl: "https://example.com",
    env: {
      WP_TOKEN: "secret-token"
    },
    fetchImpl
  });

  await client.getCollection("/wp-json/wp/v2/pages");

  assert.equal(requests[0].init.headers.authorization, "Bearer secret-token");
});
