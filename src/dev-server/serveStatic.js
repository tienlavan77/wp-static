import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
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
  const liveReload = options.liveReload === true;
  const clients = new Set();

  const server = http.createServer(async (request, response) => {
    if (liveReload && request.url === "/__wpsc/reload") {
      response.writeHead(200, {
        "cache-control": "no-cache",
        "connection": "keep-alive",
        "content-type": "text/event-stream"
      });
      response.write("\n");
      clients.add(response);
      request.on("close", () => clients.delete(response));
      return;
    }

    const filePath = await resolveFilePath(rootDir, request.url ?? "/");

    if (!filePath) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const contentType = TYPES[path.extname(filePath)] ?? "application/octet-stream";

    response.writeHead(200, {
      "content-type": contentType
    });

    if (liveReload && path.extname(filePath) === ".html") {
      response.end(injectLiveReloadScript(await readFile(filePath, "utf8")));
      return;
    }

    createReadStream(filePath).pipe(response);
  });

  server.listen(port);
  server.reload = () => {
    for (const client of clients) {
      client.write("event: reload\ndata: now\n\n");
    }
  };

  return server;
}

function injectLiveReloadScript(html) {
  const script = [
    '<script type="module">',
    'const events = new EventSource("/__wpsc/reload");',
    'events.addEventListener("reload", () => location.reload());',
    "</script>"
  ].join("");

  if (html.includes("</body>")) {
    return html.replace("</body>", `${script}\n  </body>`);
  }

  return `${html}\n${script}`;
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
