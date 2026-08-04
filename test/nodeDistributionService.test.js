import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createCertifiedNodeMatrix, createNodeDistributionService, selectLatestCertifiedNode } from "../framework/src/index.js";

const bytes = Buffer.from("certified-node-26.3.1");
const sha256 = createHash("sha256").update(bytes).digest("hex");

test("C039 discovers the newest stable release inside the certified major matrix", () => {
  const selected = selectLatestCertifiedNode({ arch: "x64", matrix: { majors: [20, 22, 26] }, metadata: metadata(), platform: "linux" });
  assert.equal(selected.version, "26.3.1");
  assert.equal(selected.platform, "linux-x64");
});

test("C039 never auto-selects a newer untested major or unstable release", () => {
  const selected = selectLatestCertifiedNode({ arch: "x64", matrix: createCertifiedNodeMatrix({ majors: [20, 22, 26] }), metadata: metadata(), platform: "linux" });
  assert.equal(selected.version, "26.3.1");
  assert.notEqual(selected.version, "27.0.0");
  assert.throws(() => selectLatestCertifiedNode({ arch: "x64", matrix: { majors: [18] }, metadata: metadata(), platform: "linux" }), /No certified stable Node distribution/);
});

test("C039 rejects untrusted metadata, archive redirects and checksum mismatch", async () => {
  const untrustedMetadata = service({ metadataUrl: "https://evil.test/index.json" });
  await assert.rejects(() => untrustedMetadata.discover(), /not trusted/);
  const redirect = service({ downloadUrl: "https://mirror.evil.test/node.tar.xz" });
  const redirectRoot = await mkdtemp(path.join(os.tmpdir(), "wpsc-c039-redirect-"));
  await assert.rejects(() => redirect.install({ installationId: "production", target: path.join(redirectRoot, "node") }), /not trusted/);
  const mismatch = service({ archiveBytes: Buffer.from("certified-node-26.3.X") });
  const mismatchRoot = await mkdtemp(path.join(os.tmpdir(), "wpsc-c039-checksum-"));
  await assert.rejects(() => mismatch.install({ installationId: "production", target: path.join(mismatchRoot, "node") }), (error) => error.code === "installation.node.checksum_mismatch");
});

test("C039 rejects traversal, absolute paths, external symlinks and special archive entries", async () => {
  for (const archiveEntries of [
    [{ path: "../escape", type: "file" }],
    [{ path: "/absolute", type: "file" }],
    [{ path: "node/link", target: "/etc/passwd", type: "symlink" }],
    [{ path: "node/device", type: "device" }],
    [{ path: "node/hardlink", type: "hardlink" }]
  ]) {
    const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c039-archive-policy-"));
    await assert.rejects(() => service({ archiveEntries }).install({ installationId: "production", target: path.join(root, "node") }), /Unsafe Node archive/);
  }
});

test("C039 preserves an existing valid certified Node runtime", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c039-existing-"));
  const target = path.join(root, "node");
  await mkdir(target);
  await writeFile(path.join(target, "version"), "v26.3.1");
  let downloads = 0;
  const result = await service({ onDownload: () => { downloads += 1; } }).install({ installationId: "production", target });
  assert.equal(result.changed, false);
  assert.equal(result.preserved, true);
  assert.equal(downloads, 0);
  assert.equal(await readFile(path.join(target, "version"), "utf8"), "v26.3.1");
});

test("C039 atomically installs and pins the verified Node version", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c039-install-"));
  const target = path.join(root, "node");
  const result = await service().install({ installationId: "production", target });
  assert.equal(result.version, "26.3.1");
  assert.equal(await readFile(path.join(target, "version"), "utf8"), "v26.3.1");
});

test("C039 failed installation restores the previous valid runtime", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c039-rollback-"));
  const target = path.join(root, "node");
  await mkdir(target);
  await writeFile(path.join(target, "version"), "v22.14.0");
  await writeFile(path.join(target, "sentinel"), "previous-runtime");
  const installer = service({ stagedVersion: "v26.3.0" });
  await assert.rejects(() => installer.install({ installationId: "production", target }), /does not match verified/);
  assert.equal(await readFile(path.join(target, "version"), "utf8"), "v22.14.0");
  assert.equal(await readFile(path.join(target, "sentinel"), "utf8"), "previous-runtime");
});

test("C039 activation failure after moving the old runtime restores it atomically", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c039-switch-failure-"));
  const target = path.join(root, "node");
  await mkdir(target);
  await writeFile(path.join(target, "version"), "v22.14.0");
  await writeFile(path.join(target, "sentinel"), "old-runtime");
  let renames = 0;
  const installer = service({ rename: async (source, destination) => { renames += 1; if (renames === 2) throw new Error("simulated atomic activation failure"); await rename(source, destination); } });
  await assert.rejects(() => installer.install({ installationId: "production", target }), /simulated atomic activation failure/);
  assert.equal(await readFile(path.join(target, "version"), "utf8"), "v22.14.0");
  assert.equal(await readFile(path.join(target, "sentinel"), "utf8"), "old-runtime");
});

function service(input = {}) {
  return createNodeDistributionService({
    allowedHosts: ["nodejs.org"],
    arch: "x64",
    download: async () => { input.onDownload?.(); return { bytes: input.archiveBytes ?? bytes, url: input.downloadUrl ?? "https://nodejs.org/dist/v26.3.1/node.tar.xz" }; },
    extract: async ({ destination }) => { await mkdir(destination, { recursive: true }); await writeFile(path.join(destination, "version"), input.stagedVersion ?? "v26.3.1"); },
    fetchMetadata: async () => ({ metadata: metadata(), url: input.metadataUrl ?? "https://nodejs.org/dist/index.json" }),
    inspectVersion: async (directory) => readFile(path.join(directory, "version"), "utf8"),
    inspectArchive: async () => input.archiveEntries ?? [{ path: "node-v26.3.1/", type: "directory" }, { path: "node-v26.3.1/bin/node", type: "file" }],
    matrix: { majors: [20, 22, 26] },
    platform: "linux",
    rename: input.rename
  });
}

function metadata() {
  const file = { archiveType: "tar.xz", sha256, size: bytes.length, url: "https://nodejs.org/dist/v26.3.1/node.tar.xz" };
  return { schema: "wpsc.node-distributions", schemaVersion: 1, releases: [
    { files: { "linux-x64": file }, stable: true, version: "20.19.5" },
    { files: { "linux-x64": file }, stable: true, version: "26.3.1" },
    { files: { "linux-x64": { ...file, url: "https://nodejs.org/dist/v27.0.0/node.tar.xz" } }, stable: true, version: "27.0.0" },
    { files: { "linux-x64": file }, stable: false, version: "26.4.0" }
  ] };
}
