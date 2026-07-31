import { readdir } from "node:fs/promises";
import createSiteContext from "./createSiteContext.js";
import createSiteLoader from "./createSiteLoader.js";
import createSiteRepository from "./createSiteRepository.js";
import {
  createEmptySiteRegistry,
  normalizeDomain,
  SiteOperationalStatus,
  validateSiteRegistry
} from "./siteRegistryContract.js";

export { SiteOperationalStatus } from "./siteRegistryContract.js";

export function createSiteRelativePath(siteId) {
  return `sites/${String(siteId)}`;
}

export default function createSiteRegistry(options = {}) {
  const repository = options.repository || createSiteRepository(options);
  const loader = options.loader || createSiteLoader({ repository });
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();

  async function read() {
    try {
      const registry = await repository.readRegistry();
      const validation = validateSiteRegistry(registry);
      if (!validation.ok) throw new Error(validation.errors.map((entry) => entry.message).join(" "));
      return registry;
    } catch (error) {
      if (error.code === "ENOENT") return createEmptySiteRegistry(now());
      throw error;
    }
  }

  async function register(input = {}) {
    const siteId = String(input.siteId ?? "").trim();
    const metadata = await repository.readMetadata(siteId);
    const registry = await read();
    if (registry.sites.some((record) => record.siteId === siteId)) throw new Error(`Site is already registered: ${siteId}.`);

    const record = createRecord({ ...input, siteId, uuid: metadata.uuid }, now());
    assertDomainsAvailable(record.domains, registry.sites);
    const next = { ...registry, sites: [...registry.sites, record].sort(sortBySiteId), updatedAt: now() };
    await repository.writeRegistry(next);
    return record;
  }

  async function update(siteId, input = {}) {
    const registry = await read();
    const current = registry.sites.find((record) => record.siteId === siteId);
    if (!current) throw new Error(`Site is not registered: ${siteId}.`);
    const record = createRecord({ ...current, ...input, siteId, uuid: current.uuid }, now(), current.createdAt);
    assertDomainsAvailable(record.domains, registry.sites.filter((entry) => entry.siteId !== siteId));
    await repository.writeRegistry({ ...registry, sites: registry.sites.map((entry) => entry.siteId === siteId ? record : entry), updatedAt: now() });
    return record;
  }

  async function setStatus(siteId, status) {
    return update(siteId, { status });
  }

  async function resolveByDomain(domain) {
    const normalized = normalizeDomain(domain);
    if (!normalized) return null;
    const registry = await read();
    return registry.sites.find((record) => record.status === SiteOperationalStatus.ACTIVE && record.domains.includes(normalized)) ?? null;
  }

  async function resolveContext(domain) {
    const record = await resolveByDomain(domain);
    return record ? createSiteContext({ domain: normalizeDomain(domain), siteId: record.siteId }) : null;
  }

  async function listSiteIds() {
    const registry = await read();
    if (registry.sites.length > 0) return registry.sites.filter((record) => record.status !== SiteOperationalStatus.DELETED).map((record) => record.siteId);
    return legacySiteIds();
  }

  async function listSites() {
    const registry = await read();
    if (registry.sites.length > 0) {
      return Promise.all(registry.sites.map(async (record) => {
        const metadata = await repository.readMetadata(record.siteId);
        return { ...record, id: record.siteId, metadata, name: metadata.name, relativePath: createSiteRelativePath(record.siteId) };
      }));
    }
    return Promise.all((await legacySiteIds()).map(async (siteId) => {
      const metadata = await repository.readMetadata(siteId);
      return { id: siteId, metadata, name: metadata.name, relativePath: createSiteRelativePath(siteId) };
    }));
  }

  async function loadSite(siteId) {
    return loader.load(siteId);
  }

  async function findByUuid(uuid) {
    const registry = await read();
    const record = registry.sites.find((entry) => entry.uuid === uuid);
    if (record) return record;
    return (await listSites()).find((site) => site.metadata?.uuid === uuid) ?? null;
  }

  async function legacySiteIds() {
    try {
      const entries = await readdir(repository.sitesDir, { withFileTypes: true });
      return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }

  return Object.freeze({ findByUuid, listSiteIds, listSites, loadSite, loader, read, register, repository, resolveByDomain, resolveContext, setStatus, update });
}

function createRecord(input, updatedAt, createdAt = updatedAt) {
  const domains = [...new Set((input.domains ?? []).map(normalizeDomain))];
  if (domains.some((domain) => !domain)) throw new Error("Site Registry domains must be valid hostnames or URLs without paths.");
  const status = String(input.status ?? SiteOperationalStatus.ACTIVE).toLowerCase();
  if (!Object.values(SiteOperationalStatus).includes(status)) throw new Error(`Invalid Site operational status: ${status}.`);
  return {
    createdAt,
    domains,
    environment: input.environment ?? "production",
    runtimeConfigRef: input.runtimeConfigRef ?? null,
    siteId: input.siteId,
    status,
    updatedAt,
    uuid: input.uuid
  };
}

function assertDomainsAvailable(domains, records) {
  const used = new Set(records.flatMap((record) => record.domains));
  const duplicate = domains.find((domain) => used.has(domain));
  if (duplicate) throw new Error(`Domain is already mapped to another Site: ${duplicate}.`);
}

function sortBySiteId(first, second) {
  return first.siteId.localeCompare(second.siteId);
}
