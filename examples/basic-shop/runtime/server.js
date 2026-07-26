import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createCommerceRuntime,
  createWooCommerceAccountService,
  createWordPressAuthService
} from "../../../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, "..");
const distDir = path.join(projectDir, "dist");

await loadEnvFile(path.join(projectDir, ".env"));

const port = Number(process.env.WPSC_RUNTIME_PORT ?? process.env.PORT ?? 8787);
const baseUrl = process.env.WPSC_WP_URL ?? process.env.WP_URL ?? "https://api.tinsinhphat.com";
const authEndpoint = process.env.WPSC_AUTH_ENDPOINT ?? "/wp-json/wpsc/v1/auth/login";
const wpAuth = createWordPressAuthService({
  baseUrl,
  bridgeSecret: process.env.WPSC_AUTH_BRIDGE_SECRET,
  endpoint: authEndpoint
});
const wooAccount = createWooCommerceAccountService({
  baseUrl,
  consumerKeyEnv: "WPSC_WOO_CONSUMER_KEY",
  consumerSecretEnv: "WPSC_WOO_CONSUMER_SECRET",
  env: process.env
});
const runtime = createCommerceRuntime({
  accountAddressUpdate: wooAccount.accountAddressUpdate,
  accountLookup: wooAccount.accountLookup,
  accountOrderLookup: wooAccount.accountOrderLookup,
  accountPasswordChange: wpAuth.accountPasswordChange,
  accountPasswordReset: wpAuth.accountPasswordReset,
  accountProfileUpdate: wooAccount.accountProfileUpdate,
  authLogin: wpAuth.authLogin,
  authPasswordResetConfirm: wpAuth.authPasswordResetConfirm,
  authRegister: wpAuth.authRegister,
  authResendVerification: wpAuth.authResendVerification,
  authVerifyEmail: wpAuth.authVerifyEmail,
  checkoutProxy: wooAccount.checkoutProxy,
  orderLookup: wooAccount.orderLookup
});

const server = http.createServer(async (incoming, outgoing) => {
  try {
    if (isRuntimeRequest(incoming.url ?? "/")) {
      await handleRuntimeRequest(incoming, outgoing);
      return;
    }

    await handleStaticRequest(incoming, outgoing);
  } catch (error) {
    outgoing.writeHead(500, {
      "content-type": "application/json; charset=utf-8"
    });
    outgoing.end(JSON.stringify({
      error: error.message
    }));
  }
});

server.listen(port, () => {
  console.log(`WPSC Basic Shop runtime serving http://localhost:${port}`);
  console.log(`Static root: ${distDir}`);
  console.log(`WP/API source: ${baseUrl}`);
});

async function handleRuntimeRequest(incoming, outgoing) {
  const request = await toWebRequest(incoming);
  const response = await runtime.handle(request);

  outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  outgoing.end(Buffer.from(await response.arrayBuffer()));
}

async function handleStaticRequest(incoming, outgoing) {
  const filePath = await resolveStaticFile(incoming.url ?? "/");

  if (!filePath) {
    await serveNotFound(outgoing);
    return;
  }

  outgoing.writeHead(200, {
    "content-type": contentType(filePath)
  });
  createReadStream(filePath).pipe(outgoing);
}

async function serveNotFound(outgoing) {
  const filePath = path.resolve(distDir, "404.html");

  try {
    await stat(filePath);
    outgoing.writeHead(404, {
      "content-type": contentType(filePath)
    });
    createReadStream(filePath).pipe(outgoing);
  } catch {
    outgoing.writeHead(404, {
      "content-type": "text/plain; charset=utf-8"
    });
    outgoing.end("Not found");
  }
}

async function toWebRequest(incoming) {
  const chunks = [];

  for await (const chunk of incoming) {
    chunks.push(chunk);
  }

  return new Request(`http://localhost:${port}${incoming.url}`, {
    body: chunks.length > 0 ? Buffer.concat(chunks) : undefined,
    headers: incoming.headers,
    method: incoming.method
  });
}

function isRuntimeRequest(url) {
  const pathname = new URL(url, `http://localhost:${port}`).pathname;

  return pathname === "/health" || pathname.startsWith("/api/");
}

async function resolveStaticFile(url) {
  const pathname = decodeURIComponent(new URL(url, `http://localhost:${port}`).pathname);
  const safePath = pathname.replace(/^\/+/, "");
  const candidates = [
    path.resolve(distDir, safePath || "index.html"),
    path.resolve(distDir, safePath, "index.html"),
    path.resolve(distDir, `${safePath}.html`)
  ];
  const root = path.resolve(distDir);

  for (const candidate of candidates) {
    if (!candidate.startsWith(root)) {
      continue;
    }

    try {
      const fileStat = await stat(candidate);

      if (fileStat.isFile()) {
        return candidate;
      }
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function contentType(filePath) {
  const types = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp"
  };

  return types[path.extname(filePath)] ?? "application/octet-stream";
}

async function loadEnvFile(filePath) {
  let contents = "";

  try {
    contents = await readFile(filePath, "utf8");
  } catch {
    return;
  }

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
