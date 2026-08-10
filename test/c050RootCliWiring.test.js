import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createProductReleaseOperationsCommand from "../framework/src/cli/createProductReleaseOperationsCommand.js";

test("C050 publish requires explicit confirmation and does not call publisher", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c050-cli-"));
  try {
    const command = createProductReleaseOperationsCommand({ verifier: { verifyPackage: async () => ({ accepted: true, manifest: { schema: "wpsc.production-package", schemaVersion: 1, product: { productId: "wpsc", version: "1.2.0" } } }) }, publisher: { publish: async () => { throw new Error("must not call"); } } });
    const config = await configFile(root);
    const result = await command.run({ operation: "publish", configPath: config, channel: "production", packageDir: root, artifact: await bundleFile(root), dryRun: false });
    assert.equal(result.code, 1);
    assert.equal(result.result.code, "CONFIRMATION_REQUIRED");
  } finally { await rm(root, { force: true, recursive: true }); }
});

test("C050 publish delegates to publisher and dry-run remains explicit", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c050-cli-"));
  try {
    let received;
    const command = createProductReleaseOperationsCommand({ verifier: { verifyPackage: async () => ({ accepted: true, manifest: { schema: "wpsc.production-package", schemaVersion: 1, product: { productId: "wpsc", version: "1.2.0" } } }) }, publisher: { publish: async (input) => { received = input; return { ok: true, status: "DRY_RUN", mutation: "NONE" }; } } });
    const result = await command.run({ operation: "publish", configPath: await configFile(root), channel: "production", packageDir: root, artifact: await bundleFile(root), dryRun: true });
    assert.equal(result.code, 0);
    assert.equal(result.result.status, "DRY_RUN");
    assert.equal(received.dryRun, true);
  } finally { await rm(root, { force: true, recursive: true }); }
});

test("C050 CLI propagates C041 and publisher failures with redacted deterministic JSON", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c050-cli-failure-"));
  try {
    const config = await configFile(root);
    const rejected = createProductReleaseOperationsCommand({ verifier: { verifyPackage: async () => ({ accepted: false, diagnostics: { errors: [{ code: "product.package.signature.invalid", message: "Signature is invalid.", privateKey: "forbidden" }], warnings: [] }, ok: false }) } });
    const verification = await rejected.run({ operation: "verify", packageDir: root, publicKeyPath: path.join(root, "public.pem") });
    assert.equal(verification.code, 1);
    assert.equal(verification.result.diagnostics.errors[0].code, "product.package.signature.invalid");
    assert.doesNotMatch(JSON.stringify(verification.result), /forbidden|privateKey/);

    const conflict = createProductReleaseOperationsCommand({ verifier: { verifyPackage: async () => ({ accepted: true, manifest: { schema: "wpsc.production-package", schemaVersion: 1, product: { productId: "wpsc", version: "1.2.0" } } }) }, publisher: { publish: async () => ({ code: "RELEASE_IDENTITY_CONFLICT", diagnostics: { errors: [{ code: "RELEASE_IDENTITY_CONFLICT", message: "Conflict.", severity: "error" }], warnings: [] }, ok: false }) } });
    const publication = await conflict.run({ operation: "publish", configPath: config, channel: "production", confirmed: true, packageDir: root, artifact: await bundleFile(root) });
    assert.equal(publication.code, 1);
    assert.equal(publication.result.code, "RELEASE_IDENTITY_CONFLICT");
  } finally { await rm(root, { force: true, recursive: true }); }
});

test("C050 CLI missing arguments and invalid configuration return stable codes", async () => {
  const command = createProductReleaseOperationsCommand({});
  assert.equal((await command.run({ operation: "verify" })).result.code, "release_operations.package_dir.required");
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c050-cli-config-"));
  try {
    const file = path.join(root, "invalid.json");
    await writeFile(file, JSON.stringify({ schema: "invalid", secret: "must-not-echo" }));
    const result = await command.run({ operation: "publish", packageDir: root, artifact: file, configPath: file, channel: "production", confirmed: true });
    assert.equal(result.result.code, "release_operations.configuration.invalid");
    assert.doesNotMatch(JSON.stringify(result.result), /must-not-echo/);
  } finally { await rm(root, { force: true, recursive: true }); }
});

async function configFile(root) { const file = path.join(root, "ops.json"); await writeFile(file, JSON.stringify({ schema: "wpsc.release-operations", schemaVersion: 1, channels: { production: { artifactBaseUrl: "https://releases.example.test/", allowedHosts: ["releases.example.test"], publisher: { root: path.join(root, "dist") } } }, signing: { publicKeyPath: path.join(root, "public.pem") } })); await writeFile(path.join(root, "public.pem"), "public"); return file; }
async function bundleFile(root) { const file = path.join(root, "wpsc-1.2.0.bundle.json"); await writeFile(file, JSON.stringify({ schema: "wpsc.production-package-bundle", schemaVersion: 1, productId: "wpsc", version: "1.2.0", entries: [] })); return file; }
