import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

export default function serveStatic(rootDir, options = {}) {
  const port = options.port ?? 8080;

  const server = http.createServer(async (request, response) => {
    const filePath = await resolveFilePath(rootDir, request.url ?? "/");

    if (!filePath) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "content-type": TYPES[path.extname(filePath)] ?? "application/octet-stream"
    });
    createReadStream(filePath).pipe(response);
  });

  server.listen(port);

  return server;
}

async function resolveFilePath(rootDir, requestUrl) {
  const url = new URL(requestUrl, "http://localhost");
  const pathname = decodeURIComponent(url.pathname);
  const safePath = pathname.replace(/^\/+/, "");
  const candidates = [
    path.resolve(rootDir, safePath),
    path.resolve(rootDir, safePath, "index.html"),
    path.resolve(rootDir, `${safePath}.html`)
  ];

  for (const candidate of candidates) {
    if (!candidate.startsWith(path.resolve(rootDir))) {
      continue;
    }

    try {
      const candidateStat = await stat(candidate);

      if (candidateStat.isFile()) {
        return candidate;
      }
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}
