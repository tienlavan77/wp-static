import { mkdir } from "node:fs/promises";
import createSiteMetadata, {
  SiteState,
  validateSiteMetadata
} from "../site/createSiteMetadata.js";
import createSiteRepository from "../site/createSiteRepository.js";
import createSitePathPolicy from "../site/createSitePathPolicy.js";
import createSiteUuid from "../site/createSiteUuid.js";

export const PROVISIONING_SERVICE_VERSION = "1.0";

export const ProvisioningEvent = Object.freeze({
  COMPLETED: "provision.completed",
  DIRECTORY_CREATED: "provision.directory.created",
  FAILED: "provision.failed",
  METADATA_GENERATED: "provision.metadata.generated",
  METADATA_VALIDATED: "provision.metadata.validated",
  METADATA_WRITTEN: "provision.metadata.written",
  STARTED: "provision.started"
});

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
  const onEvent = typeof options.onEvent === "function" ? options.onEvent : null;

  function createEventRecorder() {
    const events = [];

    function emit(type, payload = {}) {
      const event = {
        payload,
        timestamp: payload.timestamp || null,
        type
      };
      events.push(event);
      onEvent?.(event);
      return event;
    }

    return {
      emit,
      events
    };
  }

  async function createSite(input = {}) {
    const eventRecorder = createEventRecorder();
    const siteId = normalizeSiteId(input.siteId || input.name);

    if (!siteId) {
      eventRecorder.emit(ProvisioningEvent.FAILED, {
        reason: "missing-site-id"
      });
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
        events: eventRecorder.events,
        ok: false
      };
    }

    eventRecorder.emit(ProvisioningEvent.STARTED, {
      siteId
    });

    const siteRoot = repository.resolveSiteRoot(siteId);
    const pathPolicy = createSitePathPolicy({
      siteRoot
    });

    for (const directory of SITE_PROVISIONING_DIRECTORIES) {
      await mkdir(pathPolicy.resolve(directory), {
        recursive: true
      });
      eventRecorder.emit(ProvisioningEvent.DIRECTORY_CREATED, {
        directory,
        siteId
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
    eventRecorder.emit(ProvisioningEvent.METADATA_GENERATED, {
      siteId,
      uuid: metadata.uuid
    });

    const validation = validateSiteMetadata(metadata);

    if (!validation.ok) {
      eventRecorder.emit(ProvisioningEvent.FAILED, {
        errors: validation.errors,
        reason: "metadata-validation-failed",
        siteId
      });
      return {
        diagnostics: {
          errors: validation.errors,
          warnings: []
        },
        events: eventRecorder.events,
        ok: false
      };
    }

    eventRecorder.emit(ProvisioningEvent.METADATA_VALIDATED, {
      siteId
    });

    const write = await repository.writeMetadata(siteId, metadata);
    eventRecorder.emit(ProvisioningEvent.METADATA_WRITTEN, {
      path: write.path,
      siteId
    });

    eventRecorder.emit(ProvisioningEvent.COMPLETED, {
      siteId
    });

    return {
      diagnostics: {
        errors: [],
        warnings: []
      },
      events: eventRecorder.events,
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
