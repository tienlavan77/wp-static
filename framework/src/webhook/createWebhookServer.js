import http from "node:http";
import createWebhookReceiver from "./createWebhookReceiver.js";

export default function createWebhookServer(options = {}) {
  const receiver = createWebhookReceiver(options);
  const pathname = options.pathname ?? "/webhook/rebuild";
  const server = http.createServer(async (incoming, outgoing) => {
    const request = createRequest(incoming);
    const url = new URL(request.url);
    const response = url.pathname === "/health"
      ? new Response(JSON.stringify({ ok: true }), {
        headers: {
          "content-type": "application/json; charset=utf-8"
        },
        status: 200
      })
      : url.pathname === pathname
      ? await receiver.handle(request)
      : new Response(JSON.stringify({ error: "Not found" }), {
        headers: {
          "content-type": "application/json; charset=utf-8"
        },
        status: 404
      });

    outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    outgoing.end(await response.text());
  });

  return {
    listen(port = 8787) {
      server.listen(port);
      return server;
    },
    receiver,
    server
  };
}

function createRequest(incoming) {
  const protocol = incoming.headers["x-forwarded-proto"] ?? "http";
  const host = incoming.headers.host ?? "localhost";
  const url = `${protocol}://${host}${incoming.url}`;
  const method = incoming.method ?? "GET";
  const init = {
    headers: incoming.headers,
    method
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = incoming;
    init.duplex = "half";
  }

  return new Request(url, init);
}
