import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { createTrustedNodeMetadataAdapter, extractTarXzArchive, inspectTarXzArchive } from "../framework/src/product/installer/createNodeDistributionProductionAdapters.js";

const execFile = promisify(execFileCallback);

test("C039 converts trusted Node index and SHASUMS data into certified metadata", async () => {
  const adapter = createTrustedNodeMetadataAdapter({
    fetch: async (url) => ({
      ok: true,
      url,
      json: async () => [{ lts: "Krypton", version: "v26.3.1" }, { lts: false, version: "v27.0.0" }],
      text: async () => "55647180e4ae58ffeaa3294e89aa4abda7c371dfbd64b44cbdb022980177aae0  node-v26.3.1-linux-x64.tar.xz\n"
    })
  });
  const result = await adapter();
  assert.equal(result.url, "https://nodejs.org/dist/index.json");
  assert.equal(result.metadata.releases[0].version, "26.3.1");
  assert.equal(result.metadata.releases[0].files["linux-x64"].sha256, "55647180e4ae58ffeaa3294e89aa4abda7c371dfbd64b44cbdb022980177aae0");
});

test("C039 tar.xz adapters expose entry type and symlink target before safe staging extraction", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c039-adapters-"));
  try {
    const source = path.join(root, "node-v26.3.1-linux-x64");
    await mkdir(path.join(source, "bin"), { recursive: true });
    await writeFile(path.join(source, "bin", "node"), "node");
    await symlink("bin/node", path.join(source, "node-link"));
    const archive = path.join(root, "node.tar.xz");
    await execFile("tar", ["-cJf", archive, "-C", root, path.basename(source)]);
    const bytes = await readFile(archive);
    const entries = await inspectTarXzArchive({ bytes });
    assert.ok(entries.some((entry) => entry.type === "file" && entry.path.endsWith("bin/node")));
    assert.ok(entries.some((entry) => entry.type === "symlink" && entry.path.endsWith("node-link") && entry.target === "bin/node"));
    const destination = path.join(root, "staging");
    await extractTarXzArchive({ bytes, destination });
    assert.equal(await readFile(path.join(destination, "bin", "node"), "utf8"), "node");
  } finally { await rm(root, { force: true, recursive: true }); }
});
