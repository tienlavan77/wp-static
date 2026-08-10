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
  assert.deepEqual(JSON.parse(await readFile(path.join(root, release.version, "release.json"))), release);
  assert.equal((await stat(path.join(root, release.version, `wpsc-${release.version}.bundle.json`))).size, release.size);
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
