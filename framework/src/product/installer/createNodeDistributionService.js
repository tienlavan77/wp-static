import { createHash } from "node:crypto";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { assertTrustedDistributionUrl, selectLatestCertifiedNode, validateNodeArchiveEntries } from "./nodeDistributionContract.js";

export default function createNodeDistributionService(options = {}) {
  const allowedHosts = options.allowedHosts ?? ["nodejs.org"];
  const fetchMetadata = options.fetchMetadata;
  const download = options.download;
  const extract = options.extract;
  const inspectVersion = options.inspectVersion;
  const inspectArchive = options.inspectArchive;
  const renamePath = options.rename ?? rename;
  const matrix = options.matrix;
  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;

  async function discover() {
    const response = await fetchMetadata();
    assertTrustedDistributionUrl(response.url, allowedHosts);
    const selected = selectLatestCertifiedNode({ arch, matrix, metadata: response.metadata, platform });
    assertTrustedDistributionUrl(selected.file.url, allowedHosts);
    return selected;
  }

  async function install(input = {}) {
    const selected = input.selected ?? await discover();
    const target = path.resolve(input.target);
    const targetExists = await stat(target).then(() => true, () => false);
    const installedVersion = await inspectVersion(target).catch(() => null);
    if (installedVersion === `v${selected.version}` || installedVersion === selected.version) return result({ changed: false, preserved: true, version: selected.version });
    const parent = path.dirname(target);
    const staging = `${target}.installing-${input.installationId}`;
    const previous = `${target}.previous-${input.installationId}`;
    await mkdir(parent, { recursive: true });
    await rm(staging, { force: true, recursive: true });
    await rm(previous, { force: true, recursive: true });
    let previousMoved = false;
    try {
      const downloaded = await download({ expectedSize: selected.file.size, url: assertTrustedDistributionUrl(selected.file.url, allowedHosts) });
      assertTrustedDistributionUrl(downloaded.url, allowedHosts);
      if (selected.file.size > 0 && downloaded.bytes.length !== selected.file.size) throw new Error("Node distribution size mismatch.");
      assertChecksum(downloaded.bytes, selected.file.sha256);
      if (typeof inspectArchive !== "function") throw new TypeError("Node archive inspector is required before extraction.");
      validateNodeArchiveEntries(await inspectArchive({ archiveType: selected.file.archiveType, bytes: downloaded.bytes }));
      await extract({ archiveType: selected.file.archiveType, bytes: downloaded.bytes, destination: staging, pathPolicy: "node-safe-relative-files-only" });
      const stagedVersion = await inspectVersion(staging);
      if (stagedVersion !== `v${selected.version}` && stagedVersion !== selected.version) throw new Error(`Installed Node version ${stagedVersion} does not match verified ${selected.version}.`);
      if (targetExists) { await renamePath(target, previous); previousMoved = true; }
      await renamePath(staging, target);
      await rm(previous, { force: true, recursive: true });
      return result({ changed: true, preserved: false, version: selected.version });
    } catch (error) {
      await rm(staging, { force: true, recursive: true });
      if (previousMoved) { await rm(target, { force: true, recursive: true }); await renamePath(previous, target); }
      throw error;
    }
  }
  return Object.freeze({ discover, install });
}

export function assertChecksum(bytes, expected) {
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== expected) { const error = new Error("Node distribution checksum mismatch."); error.code = "installation.node.checksum_mismatch"; throw error; }
  return actual;
}

function result(data) { return Object.freeze({ diagnostics: { errors: [], warnings: [] }, ok: true, ...data }); }
