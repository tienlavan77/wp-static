import deepFreeze from "../shared/deepFreeze.js";
import { SiteOperationalStatus } from "../site/siteRegistryContract.js";

export const SITE_OPERATIONS_SCHEMA = "wpsc.site-operations";
export const SITE_OPERATIONS_VERSION = 1;

export default function createSiteOperationsService(options = {}) {
  const registry = options.registry;
  if (!registry || typeof registry.listSites !== "function" || typeof registry.read !== "function") {
    throw new TypeError("Site Operations Service requires a Site Registry.");
  }
  const repository = options.repository || registry.repository;
  const readers = options.readers ?? {};

  async function list() {
    const sites = await registry.listSites();
    return snapshot({
      sites: sites.map((site) => ({
        id: site.siteId ?? site.id,
        name: site.name ?? site.metadata?.name ?? site.siteId ?? site.id,
        status: site.status ?? SiteOperationalStatus.ACTIVE,
        uuid: site.uuid ?? site.metadata?.uuid ?? null,
        domains: [...(site.domains ?? [])]
      }))
    });
  }

  async function inspect(siteId) {
    const id = requireSiteId(siteId);
    const record = (await registry.listSites()).find((site) => (site.siteId ?? site.id) === id);
    if (!record) return failure("site.operations.site.not_found", `Site was not found: ${id}.`);

    const metadata = record.metadata ?? await repository.readMetadata(id);
    const [runtime, build, scheduler, queue, deployment] = await Promise.all([
      readState(readers.runtime, id),
      readState(readers.build, id),
      readState(readers.scheduler, id),
      readState(readers.queue, id),
      readState(readers.deployment, id)
    ]);

    return success({
      site: {
        id,
        name: record.name ?? metadata.name,
        uuid: record.uuid ?? metadata.uuid,
        status: record.status ?? SiteOperationalStatus.ACTIVE,
        domains: [...(record.domains ?? [])],
        environment: record.environment ?? "production",
        runtimeConfigRef: record.runtimeConfigRef ?? null
      },
      configuration: await readOptional(repository.readSettings?.bind(repository), id),
      metadata: { ...metadata },
      state: { build, deployment, queue, runtime, scheduler }
    });
  }

  async function enable(siteId) {
    return changeStatus(siteId, SiteOperationalStatus.ACTIVE, "site.operations.enabled");
  }

  async function disable(siteId) {
    return changeStatus(siteId, SiteOperationalStatus.SUSPENDED, "site.operations.disabled");
  }

  async function changeStatus(siteId, status, event) {
    const id = requireSiteId(siteId);
    try {
      const record = await registry.setStatus(id, status);
      return success({ event, site: record });
    } catch (error) {
      return failure("site.operations.status.update.failed", error.message);
    }
  }

  return Object.freeze({ disable, enable, inspect, list });
}

async function readState(reader, siteId) {
  if (!reader) return null;
  if (typeof reader === "function") return reader(siteId);
  if (typeof reader.get === "function") return reader.get(siteId);
  if (typeof reader.inspect === "function") return reader.inspect(siteId);
  return null;
}

async function readOptional(reader, siteId) {
  if (typeof reader !== "function") return null;
  try { return await reader(siteId); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

function requireSiteId(siteId) {
  const value = String(siteId ?? "").trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(value)) throw new TypeError("A valid Site id is required.");
  return value;
}

function success(data) {
  return snapshot({ diagnostics: { errors: [], warnings: [] }, ok: true, ...data });
}

function failure(code, message) {
  return snapshot({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false });
}

function snapshot(value) {
  return deepFreeze(value);
}
