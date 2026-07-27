import { mkdir } from "node:fs/promises";
import createSiteMetadata, {
  SiteState,
  validateSiteMetadata
} from "../site/createSiteMetadata.js";
import createSiteRepository from "../site/createSiteRepository.js";
import createSitePathPolicy from "../site/createSitePathPolicy.js";
import createSiteUuid from "../site/createSiteUuid.js";

export const PROVISIONING_SERVICE_VERSION = "1.0";

export const SITE_PROVISIONING_DIRECTORIES = Object.freeze([
  "config",
  "storage",
  "storage/cache",
  "storage/logs",
  "storage/tmp",
  "storage/sessions",
  "public",
  "public/dist",
  "themes",
  "plugins"
]);

function normalizeSiteId(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function createProvisioningService(options = {}) {
  const repository = options.repository || createSiteRepository(options);

  async function createSite(input = {}) {
    const siteId = normalizeSiteId(input.siteId || input.name);

    if (!siteId) {
      return {
        diagnostics: {
          errors: [
            {
              code: "provision.site_id.required",
              message: "Site id is required."
            }
          ],
          warnings: []
        },
        ok: false
      };
    }

    const siteRoot = repository.resolveSiteRoot(siteId);
    const pathPolicy = createSitePathPolicy({
      siteRoot
    });

    for (const directory of SITE_PROVISIONING_DIRECTORIES) {
      await mkdir(pathPolicy.resolve(directory), {
        recursive: true
      });
    }

    const metadata = createSiteMetadata({
      createdAt: input.createdAt,
      frameworkVersion: input.frameworkVersion,
      name: input.name || siteId,
      now: input.now,
      status: SiteState.SETUP_REQUIRED,
      updatedAt: input.updatedAt,
      uuid: createSiteUuid({
        uuid: input.uuid
      })
    });
    const validation = validateSiteMetadata(metadata);

    if (!validation.ok) {
      return {
        diagnostics: {
          errors: validation.errors,
          warnings: []
        },
        ok: false
      };
    }

    const write = await repository.writeMetadata(siteId, metadata);

    return {
      diagnostics: {
        errors: [],
        warnings: []
      },
      metadata,
      ok: true,
      paths: {
        metadata: write.path,
        root: siteRoot
      },
      siteId
    };
  }

  return {
    createSite,
    repository,
    version: PROVISIONING_SERVICE_VERSION
  };
}
