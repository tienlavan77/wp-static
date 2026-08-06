#!/usr/bin/env node

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import https from "node:https";
import path from "node:path";

const options = parseArgs(process.argv.slice(2));
const bundle = path.resolve(options.bundle);
const certificate = path.resolve(options.cert);
const key = path.resolve(options.key);
const bundleName = path.basename(bundle);
const bundleStat = await stat(bundle);

const server = https.createServer({ key: await readFile(key), cert: await readFile(certificate) }, (request, response) => {
  const requested = new URL(request.url || "/", "https://localhost").pathname;
  if (request.method !== "GET" || requested !== `/${bundleName}`) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found\n");
    return;
  }
  response.writeHead(200, {
    "content-type": "application/json",
    "content-length": bundleStat.size,
    "cache-control": "no-store"
  });
  createReadStream(bundle).pipe(response);
});

server.listen(options.port, options.host, () => {
  process.stdout.write(`C048 release server: https://${options.host}:${options.port}/${bundleName}\n`);
});

function parseArgs(args) {
  const value = (name, fallback) => {
    const index = args.indexOf(name);
    return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
  };
  const bundle = value("--bundle");
  const cert = value("--cert");
  const key = value("--key");
  if (!bundle || !cert || !key) throw new Error("Usage: c048-local-release-https.mjs --bundle <bundle.json> --cert <cert.pem> --key <key.pem> [--host <host>] [--port <port>]");
  return { bundle, cert, key, host: value("--host", "0.0.0.0"), port: Number(value("--port", "9443")) };
}

async function readFile(file) {
  const { readFile } = await import("node:fs/promises");
  return readFile(file);
}
