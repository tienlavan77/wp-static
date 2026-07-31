import http from "node:http";
import createHttpInstaller from "../framework/src/release/createHttpInstaller.js";
import createInstallationLock from "../framework/src/release/createInstallationLock.js";

const releaseDir = process.env.WPSC_RELEASE_DIR || "/home/data/sites/statictsp";
const port = Number(process.env.PORT || 8788);

const installer = createHttpInstaller({
  installationLock: createInstallationLock({ releaseDir }),
  releaseDir
});

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const body = await readBody(req);

  const response = await installer.handle({
    method: req.method,
    path: url.pathname,
    url: url.pathname + url.search,
    body
  });

  res.writeHead(response.status, response.headers);
  res.end(
    typeof response.body === "string"
      ? response.body
      : JSON.stringify(response.body)
  );
});

server.listen(port, "127.0.0.1", () => {
  console.log(`WPSC installer running at http://127.0.0.1:${port}/install`);
});
