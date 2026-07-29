import { createServer } from "node:http";

export const RUNTIME_HTTP_SERVER_VERSION = "1.0";

function parseBody(raw, contentType) {
  if (!raw || !String(contentType || "").toLowerCase().includes("application/json")) return {};
  return JSON.parse(raw);
}

/**
 * Exposes the pure Runtime Router through Node's HTTP boundary.
 * Site workflow remains entirely inside the injected router.
 */
export default function createRuntimeHttpServer(options = {}) {
  const router = options.router;
  if (!router || typeof router.handle !== "function") {
    throw new TypeError("Runtime HTTP Server requires a Runtime Router.");
  }

  return createServer(async (request, response) => {
    try {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const result = await router.handle({
        body: parseBody(Buffer.concat(chunks).toString("utf8"), request.headers["content-type"]),
        headers: request.headers,
        host: request.headers.host,
        method: request.method,
        path: new URL(request.url || "/", "http://runtime.local").pathname
      });
      const isHtml = typeof result.body === "string";
      response.writeHead(result.status, result.headers || { "content-type": isHtml ? "text/html; charset=utf-8" : "application/json; charset=utf-8" });
      response.end(isHtml ? result.body : `${JSON.stringify(result.body)}\n`);
    } catch (error) {
      response.writeHead(500, { "content-type": "application/json; charset=utf-8" });
      response.end(`${JSON.stringify({ diagnostics: { errors: [{ code: "runtime.http.request.failed", message: error.message, severity: "error" }], warnings: [] }, ok: false })}\n`);
    }
  });
}
