import { readdir } from "node:fs/promises";
import path from "node:path";
import createSiteLoader from "./createSiteLoader.js";
import createSiteRepository from "./createSiteRepository.js";

export function createSiteRelativePath(siteId) {
  return path.posix.join("sites", String(siteId));
}

export default function createSiteRegistry(options = {}) {
  const repository = options.repository || createSiteRepository(options);
  const loader = options.loader || createSiteLoader({
    repository
  });

  async function listSiteIds() {
    const entries = await readdir(repository.sitesDir, {
      withFileTypes: true
    });

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  }

  async function listSites() {
    const siteIds = await listSiteIds();
    const sites = [];

    for (const siteId of siteIds) {
      const metadata = await repository.readMetadata(siteId);
      sites.push({
        id: siteId,
        metadata,
        name: metadata.name,
        relativePath: createSiteRelativePath(siteId)
      });
    }

    return sites;
  }

  async function loadSite(siteId) {
    return loader.load(siteId);
  }

  async function findByUuid(uuid) {
    const sites = await listSites();
    return sites.find((site) => site.metadata.uuid === uuid) || null;
  }

  return {
    findByUuid,
    listSiteIds,
    listSites,
    loadSite,
    loader,
    repository
  };
}
