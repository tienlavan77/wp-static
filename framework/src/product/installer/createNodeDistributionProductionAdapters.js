import { createHash } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { normalizeNodeDistributionMetadata } from "./nodeDistributionContract.js";

const execFile = promisify(execFileCallback);

export function createTrustedNodeMetadataAdapter(options = {}) {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const host = options.host ?? "nodejs.org";
  const majors = options.majors ?? [20, 22, 26];
  return async function fetchMetadata() {
    const indexUrl = `https://${host}/dist/index.json`;
    const indexResponse = await fetchImpl(indexUrl, { redirect: "follow" });
    if (!indexResponse.ok || new URL(indexResponse.url || indexUrl).hostname !== host) throw new Error("Trusted Node metadata request failed.");
    const releases = await indexResponse.json();
    const candidates = releases.filter((item) => item.version && !item.version.includes("-") && majors.includes(Number(item.version.replace(/^v/, "").split(".")[0])));
    const normalized = [];
    for (const release of candidates) {
      const version = release.version.replace(/^v/, "");
      const fileName = `node-v${version}-linux-x64.tar.xz`;
      const sumsUrl = `https://${host}/dist/v${version}/SHASUMS256.txt`;
      const sumsResponse = await fetchImpl(sumsUrl, { redirect: "follow" });
      if (!sumsResponse.ok || new URL(sumsResponse.url || sumsUrl).hostname !== host) continue;
      const match = (await sumsResponse.text()).split("\n").find((line) => line.endsWith(`  ${fileName}`) || line.endsWith(` ${fileName}`));
      if (!match) continue;
      const sha256 = match.trim().split(/\s+/)[0];
      const archiveUrl = `https://${host}/dist/v${version}/${fileName}`;
      const head = await fetchImpl(archiveUrl, { method: "HEAD", redirect: "follow" }).catch(() => null);
      const size = Number(head?.headers?.get?.("content-length") ?? 0);
      normalized.push({ stable: true, version, files: { "linux-x64": { archiveType: "tar.xz", sha256, size: Number.isSafeInteger(size) ? size : 0, url: archiveUrl } } });
    }
    return { metadata: normalizeNodeDistributionMetadata({ schema: "wpsc.node-distributions", schemaVersion: 1, releases: normalized }), url: indexUrl };
  };
}

export async function downloadNodeArchive({ url, expectedSize = 0, fetch: fetchImpl = globalThis.fetch }) {
  const response = await fetchImpl(url, { redirect: "follow" });
  const finalUrl = new URL(response.url || url);
  if (finalUrl.protocol !== "https:" || finalUrl.hostname !== "nodejs.org") throw new Error("Node archive final URL is not trusted.");
  if (!response.ok) throw new Error(`Node archive download failed with HTTP ${response.status}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (expectedSize > 0 && bytes.length !== expectedSize) throw new Error("Node archive size mismatch.");
  return { bytes, url: finalUrl.href };
}

export async function inspectTarXzArchive({ bytes }) {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-node-inspect-"));
  const archive = path.join(root, "node.tar.xz");
  try {
    await writeFile(archive, bytes, { mode: 0o600 });
    const { stdout } = await execFile("tar", ["-tvJf", archive], { maxBuffer: 16 * 1024 * 1024 });
    return stdout.split("\n").filter(Boolean).map(parseTarVerboseLine);
  } finally { await rm(root, { recursive: true, force: true }); }
}

export async function extractTarXzArchive({ bytes, destination }) {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-node-extract-"));
  const archive = path.join(root, "node.tar.xz");
  try {
    await mkdir(destination, { recursive: true });
    await writeFile(archive, bytes, { mode: 0o600 });
    await execFile("tar", ["-xJf", archive, "-C", destination, "--strip-components=1", "--no-same-owner", "--no-same-permissions"], { maxBuffer: 16 * 1024 * 1024 });
    return { ok: true, destination };
  } finally { await rm(root, { recursive: true, force: true }); }
}

function parseTarVerboseLine(line) {
  const typeCode = line[0];
  const type = typeCode === "d" ? "directory" : typeCode === "l" ? "symlink" : typeCode === "-" ? "file" : "special";
  const marker = line.indexOf(" -> ");
  const name = line.slice(line.lastIndexOf(" ") + 1);
  return { path: marker >= 0 ? line.slice(line.lastIndexOf(" ", marker - 1) + 1, marker) : name, target: marker >= 0 ? line.slice(marker + 4) : undefined, type };
}

export function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
