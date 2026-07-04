import http from "node:http";
import createWebhookReceiver from "./createWebhookReceiver.js";

export default function createWebhookServer(options = {}) {
  const receiver = createWebhookReceiver(options);
  const pathname = options.pathname ?? "/webhook/rebuild";
  const server = http.createServer(async (incoming, outgoing) => {
    const request = createRequest(incoming);
    const url = new URL(request.url);
    const response = url.pathname === pathname
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

  return new Request(url, {
    body: incoming,
    duplex: "half",
    headers: incoming.headers,
    method: incoming.method
  });
}
