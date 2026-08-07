import path from "node:path";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required C048 environment variable: ${name}`);
  return value;
}

export default async function createC048Runtime({ harnessWorkspace, workspace }) {
  const installationId = process.env.WPSC_INSTALLATION_ID || "production";
  const nodeVersion = (process.env.WPSC_NODE_VERSION || process.versions.node).replace(/^v/, "");
  const node = await verifiedC039Node(workspace, nodeVersion);
  const harness = path.resolve(harnessWorkspace);
  const { createC048VpsRuntime } = await import(pathToFileURL(path.join(harness, "framework", "src", "index.js")).href);

  return createC048VpsRuntime({
    workspace,
    installationId,
    ownerId: `c048-${process.pid}`,
    domain: required("WPSC_DOMAIN"),

    runtime: {
      host: "127.0.0.1",
      port: Number(process.env.WPSC_RUNTIME_PORT || 8787),
      user: "www-data",
      group: "www-data"
    },

    node,

    package: {
      productId: "wpsc",
      version: required("WPSC_PACKAGE_VERSION"),
      url: required("WPSC_PACKAGE_URL"),
      size: Number(required("WPSC_PACKAGE_SIZE")),
      sha256: required("WPSC_PACKAGE_SHA256"),
      publicKeyPath: process.env.WPSC_PACKAGE_PUBLIC_KEY || `${workspace}/config/core-update-public.pem`
    },

    database: {
      fingerprintCommand: [
        process.execPath,
        path.join(harness, "scripts", "c048-database-fingerprint.js"),
        "--path",
        process.env.WPSC_DATABASE_PATH || `${workspace}/storage/data.db`
      ]
    },

    domainUrl: process.env.WPSC_DOMAIN_URL || `https://${required("WPSC_DOMAIN")}/`,
    runtimeHost: process.env.WPSC_RUNTIME_HOST_HEADER || required("WPSC_DOMAIN")
  });
}

async function verifiedC039Node(workspace, expectedVersion) {
  const evidencePath = path.join(workspace, "storage", "installer", "c039-node-provision-evidence.json");
  const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
  const artifact = evidence.selectedArtifact ?? {};
  if (evidence.schema !== "wpsc.c039-node-provision" || evidence.status !== "PASS" || evidence.workspace !== workspace) throw new Error("C048 requires PASS C039 Node provisioning evidence for this workspace.");
  if (evidence.selectedVersion !== expectedVersion || !/^[a-f0-9]{64}$/.test(String(artifact.sha256)) || !Number.isSafeInteger(artifact.size) || artifact.size <= 0 || !String(artifact.url).startsWith("https://nodejs.org/")) throw new Error("C048 C039 Node artifact evidence is incomplete or does not match the executing Node.");
  return { archiveType: "tar.xz", installationId: evidence.installationId, sha256: artifact.sha256, size: artifact.size, url: artifact.url, version: evidence.selectedVersion };
}
