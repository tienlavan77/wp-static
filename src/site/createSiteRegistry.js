import { readdir } from "node:fs/promises";
import createSiteLoader from "./createSiteLoader.js";
import createSiteRepository from "./createSiteRepository.js";

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
      sites.push(await loader.load(siteId));
    }

    return sites;
  }

  async function findByUuid(uuid) {
    const sites = await listSites();
    return sites.find((site) => site.metadata.uuid === uuid) || null;
  }

  return {
    findByUuid,
    listSiteIds,
    listSites,
    loader,
    repository
  };
}
