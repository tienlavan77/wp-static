import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createReleaseArtifactPublisher from "../framework/src/product/createReleaseArtifactPublisher.js";

test("C050 publisher requires C041 acceptance and dry-run has zero mutation", async () => withFixture(async ({ artifact, publisher, release, root }) => {
  assert.equal((await publisher.publish({ artifact, release, verified: { accepted: false } })).code, "VERIFICATION_REQUIRED");
  const dry = await publisher.publish({ artifact, dryRun: true, release, verified: { accepted: true } });
  assert.equal(dry.status, "DRY_RUN");
  await assert.rejects(() => access(root));
}));

test("C050 publisher atomically publishes and repeats identical identity idempotently", async () => withFixture(async ({ artifact, publisher, release, root }) => {
  const first = await publisher.publish({ artifact, channel: "production", release, verified: { accepted: true } });
  const second = await publisher.publish({ artifact, channel: "production", release, verified: { accepted: true } });
  assert.equal(first.status, "PUBLISHED");
  assert.equal(second.status, "IDEMPOTENT_SUCCESS");
  assert.equal(second.mutation, "NONE");
  assert.deepEqual(JSON.parse(await readFile(path.join(root, release.version, "release.json"))), release);
  assert.equal((await stat(path.join(root, release.version, `wpsc-${release.version}.bundle.json`))).size, release.size);
}));

test("C050 publisher rejects matching metadata when the published bundle is missing without repair", async () => withFixture(async ({ artifact, publisher, release, root }) => {
  await publisher.publish({ artifact, release, verified: { accepted: true } });
  const metadata = path.join(root, release.version, "release.json");
  const bundle = path.join(root, release.version, `wpsc-${release.version}.bundle.json`);
  const metadataBefore = await readFile(metadata);
  await rm(bundle);
  const result = await publisher.publish({ artifact, release, verified: { accepted: true } });
  assert.equal(result.code, "RELEASE_IDENTITY_CONFLICT");
  assert.notEqual(result.status, "IDEMPOTENT_SUCCESS");
  assert.deepEqual(await readFile(metadata), metadataBefore);
  await assert.rejects(() => stat(bundle));
}));

test("C050 publisher rejects a truncated published bundle and preserves it", async () => withFixture(async ({ artifact, publisher, release, root }) => {
  await publisher.publish({ artifact, release, verified: { accepted: true } });
  const metadata = path.join(root, release.version, "release.json");
  const bundle = path.join(root, release.version, `wpsc-${release.version}.bundle.json`);
  const metadataBefore = await readFile(metadata);
  const truncated = (await readFile(bundle)).subarray(0, release.size - 1);
  await writeFile(bundle, truncated);
  const result = await publisher.publish({ artifact, release, verified: { accepted: true } });
  assert.equal(result.code, "RELEASE_IDENTITY_CONFLICT");
  assert.deepEqual(await readFile(metadata), metadataBefore);
  assert.deepEqual(await readFile(bundle), truncated);
}));

test("C050 publisher rejects same-size altered published bytes and preserves them", async () => withFixture(async ({ artifact, publisher, release, root }) => {
  await publisher.publish({ artifact, release, verified: { accepted: true } });
  const metadata = path.join(root, release.version, "release.json");
  const bundle = path.join(root, release.version, `wpsc-${release.version}.bundle.json`);
  const metadataBefore = await readFile(metadata);
  const altered = Buffer.from(await readFile(bundle));
  altered[0] ^= 0xff;
  await writeFile(bundle, altered);
  const result = await publisher.publish({ artifact, release, verified: { accepted: true } });
  assert.equal(result.code, "RELEASE_IDENTITY_CONFLICT");
  assert.deepEqual(await readFile(metadata), metadataBefore);
  assert.deepEqual(await readFile(bundle), altered);
}));

test("C050 publisher rejects inconsistent metadata without changing the published destination", async () => withFixture(async ({ artifact, publisher, release, root }) => {
  await publisher.publish({ artifact, release, verified: { accepted: true } });
  const metadata = path.join(root, release.version, "release.json");
  const bundle = path.join(root, release.version, `wpsc-${release.version}.bundle.json`);
  const bundleBefore = await readFile(bundle);
  const inconsistent = { ...release, sha256: "0".repeat(64) };
  await writeFile(metadata, `${JSON.stringify(inconsistent, null, 2)}\n`);
  const metadataBefore = await readFile(metadata);
  const result = await publisher.publish({ artifact, release, verified: { accepted: true } });
  assert.equal(result.code, "RELEASE_IDENTITY_CONFLICT");
  assert.deepEqual(await readFile(metadata), metadataBefore);
  assert.deepEqual(await readFile(bundle), bundleBefore);
}));

test("C050 publisher rejects conflicting immutable identity without overwriting", async () => withFixture(async ({ artifact, publisher, release, root }) => {
  await publisher.publish({ artifact, release, verified: { accepted: true } });
  const conflictingArtifact = path.join(path.dirname(artifact), "conflict.bundle.json");
  const content = "different-signed-product-bundle\n";
  await writeFile(conflictingArtifact, content);
  const conflicting = { ...release, size: Buffer.byteLength(content), sha256: createHash("sha256").update(content).digest("hex") };
  const result = await publisher.publish({ artifact: conflictingArtifact, release: conflicting, verified: { accepted: true } });
  assert.equal(result.code, "RELEASE_IDENTITY_CONFLICT");
  assert.deepEqual(JSON.parse(await readFile(path.join(root, release.version, "release.json"))), release);
}));

test("C050 publisher cleans staging when commit preparation fails", async () => withFixture(async ({ artifact, release, root }) => {
  const publisher = createReleaseArtifactPublisher({ root, writeMetadata: async () => { throw new Error("injected failure"); } });
  await assert.rejects(() => publisher.publish({ artifact, release, verified: { accepted: true } }), /injected failure/);
  await assert.rejects(() => access(path.join(root, release.version)));
}));

test("C050 concurrent identical publications produce one commit and one idempotent result", async () => withFixture(async ({ artifact, publisher, release }) => {
  const results = await Promise.all([publisher.publish({ artifact, release, verified: { accepted: true } }), publisher.publish({ artifact, release, verified: { accepted: true } })]);
  assert.deepEqual(results.map((item) => item.status).sort(), ["IDEMPOTENT_SUCCESS", "PUBLISHED"]);
}));

test("C050 concurrent conflicting publications allow exactly one immutable winner", async () => withFixture(async ({ artifact, publisher, release }) => {
  const conflictingArtifact = path.join(path.dirname(artifact), "concurrent-conflict.bundle.json");
  const content = "concurrent-conflicting-bundle\n";
  await writeFile(conflictingArtifact, content);
  const conflicting = { ...release, size: Buffer.byteLength(content), sha256: createHash("sha256").update(content).digest("hex") };
  const results = await Promise.all([publisher.publish({ artifact, release, verified: { accepted: true } }), publisher.publish({ artifact: conflictingArtifact, release: conflicting, verified: { accepted: true } })]);
  assert.equal(results.filter((item) => item.status === "PUBLISHED").length, 1);
  assert.equal(results.filter((item) => item.code === "RELEASE_IDENTITY_CONFLICT").length, 1);
}));

test("C050 concurrent repeats cannot accept a missing published bundle as idempotent", async () => withFixture(async ({ artifact, publisher, release, root }) => {
  await publisher.publish({ artifact, release, verified: { accepted: true } });
  const bundle = path.join(root, release.version, `wpsc-${release.version}.bundle.json`);
  await rm(bundle);
  const results = await Promise.all([
    publisher.publish({ artifact, release, verified: { accepted: true } }),
    publisher.publish({ artifact, release, verified: { accepted: true } })
  ]);
  assert.equal(results.every((result) => result.code === "RELEASE_IDENTITY_CONFLICT"), true);
  assert.equal(results.some((result) => result.status === "IDEMPOTENT_SUCCESS"), false);
  await assert.rejects(() => stat(bundle));
}));

async function withFixture(run) {
  const parent = await mkdtemp(path.join(os.tmpdir(), "wpsc-c050-publish-"));
  const root = path.join(parent, "distribution");
  const artifact = path.join(parent, "wpsc.bundle.json");
  const content = "signed-product-bundle\n";
  await writeFile(artifact, content);
  const release = { productId: "wpsc", version: "1.2.0", size: Buffer.byteLength(content), sha256: createHash("sha256").update(content).digest("hex") };
  try { await run({ artifact, publisher: createReleaseArtifactPublisher({ root }), release, root }); }
  finally { await rm(parent, { force: true, recursive: true }); }
}
