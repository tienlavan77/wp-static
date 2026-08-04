import { createC048VpsRuntime } from "../framework/src/index.js";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required C048 environment variable: ${name}`);
  return value;
}

export default async function createC048Runtime({ workspace }) {
  const installationId = process.env.WPSC_INSTALLATION_ID || "production";
  const nodeVersion = (process.env.WPSC_NODE_VERSION || process.versions.node).replace(/^v/, "");

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

    node: {
      version: nodeVersion,
      url: process.env.WPSC_NODE_URL || `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-linux-x64.tar.xz`,
      size: Number(process.env.WPSC_NODE_SIZE || 0),
      sha256: process.env.WPSC_NODE_SHA256 || "0".repeat(64),
      archiveType: "tar.xz"
    },

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
        `${workspace}/runtime/node/bin/node`,
        `${workspace}/scripts/c048-database-fingerprint.js`,
        "--path",
        process.env.WPSC_DATABASE_PATH || `${workspace}/storage/data.db`
      ]
    },

    domainUrl: process.env.WPSC_DOMAIN_URL || `https://${required("WPSC_DOMAIN")}/`,
    runtimeHost: process.env.WPSC_RUNTIME_HOST_HEADER || required("WPSC_DOMAIN")
  });
}
