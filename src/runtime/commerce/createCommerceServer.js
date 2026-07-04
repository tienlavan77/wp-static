import http from "node:http";
import createCommerceRuntime from "./createCommerceRuntime.js";

export default function createCommerceServer(options = {}) {
  const runtime = createCommerceRuntime(options);
  const server = http.createServer(async (incoming, outgoing) => {
    const request = await toRequest(incoming);
    const response = await runtime.handle(request);

    outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  });

  return {
    runtime,
    server,
    listen(port = 8787) {
      server.listen(port);
      return server;
    }
  };
}

async function toRequest(incoming) {
  const chunks = [];

  for await (const chunk of incoming) {
    chunks.push(chunk);
  }

  return new Request(`http://localhost${incoming.url}`, {
    body: chunks.length > 0 ? Buffer.concat(chunks) : undefined,
    headers: incoming.headers,
    method: incoming.method
  });
}
