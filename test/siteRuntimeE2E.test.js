import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import createProvisioningService from "../src/provision/createProvisioningService.js";
import createRuntimeHttpServer from "../src/runtime/createRuntimeHttpServer.js";
import createSiteRuntimeInstance from "../src/runtime/createSiteRuntimeInstance.js";
import createSiteRepository from "../src/site/createSiteRepository.js";

function adapter() {
  return {
    getMetadata: async () => ({ adapterVersion: "1.0", capabilities: ["supportsWebhook"], sourceType: "rest" }),
    healthCheck: async () => ({ ok: true }),
    initialize: async () => ({ ok: true }),
    registerWebhook: async () => ({ ok: true, webhookId: "webhook-e2e-1" }),
    unregisterWebhook: async () => ({ ok: true }),
    validate: async () => ({ ok: true }),
    verifyWebhook: async () => ({ ok: true })
  };
}

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
}

function close(server) {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

function request(port, { body, host = "example.test", method = "GET", path: requestPath = "/" } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const client = httpRequest({
      headers: { Host: host, ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}) },
      hostname: "127.0.0.1",
      method,
      path: requestPath,
      port
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({ body: Buffer.concat(chunks).toString("utf8"), headers: response.headers, status: response.statusCode }));
    });
    client.on("error", reject);
    if (payload) client.write(payload);
    client.end();
  });
}

async function waitForServer(port) {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { return await request(port); } catch (error) { lastError = error; await new Promise((resolve) => setTimeout(resolve, 25)); }
  }
  throw lastError;
}

test("Runtime E2E provisions, proxies a domain, configures, builds, and serves a running Site", { timeout: 20_000 }, async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-runtime-e2e-"));
  const repository = createSiteRepository({ workspaceDir });
  const provision = createProvisioningService({ repository });
  const created = await provision.createSite({ name: "Company A", uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1" });
  assert.equal(created.ok, true);

  const instance = createSiteRuntimeInstance({
    adapterLoader: { load: () => adapter() },
    contentReader: { read: async () => ({ assets: [], items: [{ id: "welcome-1", slug: "welcome", title: "Welcome to Company A", type: "page" }] }) },
    domains: { "example.test": created.siteId },
    repository,
    webhookBaseUrl: "https://example.test/webhook"
  });
  const nodeServer = createRuntimeHttpServer({ router: instance.router });
  const nodePort = await listen(nodeServer);
  const publicDir = path.join(repository.resolveSiteRoot(created.siteId), "public");
  const phpPort = await new Promise((resolve) => {
    const probe = createRuntimeHttpServer({ router: instance.router });
    probe.listen(0, "127.0.0.1", () => { const port = probe.address().port; probe.close(() => resolve(port)); });
  });
  const php = spawn("php", ["-S", `127.0.0.1:${phpPort}`, "-t", publicDir], {
    env: { ...process.env, WPSC_RUNTIME_ORIGIN: `http://127.0.0.1:${nodePort}` },
    stdio: "ignore"
  });

  try {
    const installer = await waitForServer(phpPort);
    assert.equal(installer.status, 200);
    assert.match(installer.headers["content-type"], /text\/html/);
    assert.match(installer.body, /Set up company-a/);

    const started = await request(phpPort, { method: "POST", path: "/installer/start" });
    const sessionId = JSON.parse(started.body).session.id;
    const completed = await request(phpPort, { body: { configuration: { locale: "vi-VN", siteName: "Company A" }, sessionId }, method: "POST", path: "/installer/complete" });
    assert.equal(completed.status, 200);

    const source = await request(phpPort, { body: { source: { endpoint: "https://source.example.test", type: "rest" } }, method: "POST", path: "/dashboard/source/register" });
    assert.equal(source.status, 200);
    const webhook = await request(phpPort, { body: {}, method: "POST", path: "/dashboard/webhook/register" });
    assert.equal(webhook.status, 200);

    instance.services.scheduler.start();
    const build = await request(phpPort, { body: {}, method: "POST", path: "/dashboard/build" });
    assert.equal(build.status, 200);
    assert.equal(JSON.parse(build.body).metadata.status, "RUNNING");

    const metadata = await repository.readMetadata(created.siteId);
    const sourceMetadata = await repository.readSourceMetadata(created.siteId);
    const webhookConfig = JSON.parse(await readFile(path.join(repository.resolveSiteRoot(created.siteId), "config", "webhook.json"), "utf8"));
    const buildConfig = JSON.parse(await readFile(path.join(repository.resolveSiteRoot(created.siteId), "config", "build.json"), "utf8"));
    assert.equal(metadata.status, "RUNNING");
    assert.equal(sourceMetadata.webhookStatus, "verified");
    assert.equal(webhookConfig.uuid, metadata.uuid);
    assert.equal(typeof webhookConfig.secret, "string");
    assert.equal(buildConfig.status, "SUCCESS");

    const website = await request(phpPort, { path: "/dist/welcome/index.html" });
    assert.equal(website.status, 200);
    assert.match(website.body, /Welcome to Company A/);
  } finally {
    php.kill();
    await close(nodeServer);
    await rm(workspaceDir, { force: true, recursive: true });
  }
});
