import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import createSiteRepository from "../../../framework/src/site/createSiteRepository.js";

export default async function createRuntimeWorkspace(options = {}) {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-runtime-wordpress-woocommerce-"));
  const siteId = options.siteId || "woo-e2e-site";
  const repository = createSiteRepository({ workspaceDir });
  return Object.freeze({
    repository,
    siteId,
    workspaceDir,
    async cleanup() { await rm(workspaceDir, { force: true, recursive: true }); }
  });
}
