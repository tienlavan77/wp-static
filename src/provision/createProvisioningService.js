import { mkdir, rm } from "node:fs/promises";
import createSiteMetadata, {
  SiteState,
  validateSiteMetadata
} from "../site/createSiteMetadata.js";
import createSiteRepository from "../site/createSiteRepository.js";
import createSitePathPolicy from "../site/createSitePathPolicy.js";
import createSiteUuid from "../site/createSiteUuid.js";
import { createSiteRuntimeEntryPoint } from "../runtime/createSiteRuntime.js";
import validateProvisioningEnvironment from "./validateProvisioningEnvironment.js";

export const PROVISIONING_SERVICE_VERSION = "1.0";

export const ProvisioningEvent = Object.freeze({
  COMPLETED: "provision.completed",
  DIRECTORY_CREATED: "provision.directory.created",
  ENVIRONMENT_VALIDATED: "provision.environment.validated",
  FAILED: "provision.failed",
  METADATA_GENERATED: "provision.metadata.generated",
  METADATA_VALIDATED: "provision.metadata.validated",
  METADATA_WRITTEN: "provision.metadata.written",
  RUNTIME_ENTRY_CREATED: "provision.runtime.entry.created",
  ROLLED_BACK: "provision.rolled_back",
  STARTED: "provision.started"
});

export const ProvisioningStep = Object.freeze({
  CREATE_DIRECTORIES: "create_directories",
  GENERATE_METADATA: "generate_metadata",
  VALIDATE_ENVIRONMENT: "validate_environment",
  VALIDATE_METADATA: "validate_metadata",
  WRITE_METADATA: "write_metadata",
  WRITE_RUNTIME_ENTRY: "write_runtime_entry"
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

export function planCreateSite(siteId) {
  return [
    {
      siteId,
      step: ProvisioningStep.VALIDATE_ENVIRONMENT
    },
    {
      siteId,
      step: ProvisioningStep.CREATE_DIRECTORIES
    },
    {
      siteId,
      step: ProvisioningStep.GENERATE_METADATA
    },
    {
      siteId,
      step: ProvisioningStep.VALIDATE_METADATA
    },
    {
      siteId,
      step: ProvisioningStep.WRITE_METADATA
    },
    {
      siteId,
      step: ProvisioningStep.WRITE_RUNTIME_ENTRY
    }
  ];
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

    const environmentValidator = options.validateEnvironment
      || validateProvisioningEnvironment;
    const environment = await environmentValidator({
      checks: options.environmentChecks,
      node: input.environment?.node,
      sitesDir: repository.sitesDir
    });

    if (!environment.ok) {
      eventRecorder.emit(ProvisioningEvent.FAILED, {
        errors: environment.diagnostics.errors,
        reason: "environment-check-failed",
        siteId
      });
      return {
        diagnostics: environment.diagnostics,
        environment,
        events: eventRecorder.events,
        ok: false,
        siteId
      };
    }

    eventRecorder.emit(ProvisioningEvent.ENVIRONMENT_VALIDATED, {
      siteId
    });

    const siteRoot = repository.resolveSiteRoot(siteId);
    const pathPolicy = createSitePathPolicy({
      siteRoot
    });
    const transaction = {
      plan: planCreateSite(siteId),
      rollback: []
    };

    try {
      for (const directory of SITE_PROVISIONING_DIRECTORIES) {
        await mkdir(pathPolicy.resolve(directory), {
          recursive: true
        });
        eventRecorder.emit(ProvisioningEvent.DIRECTORY_CREATED, {
          directory,
          siteId
        });
      }
      transaction.rollback.push({
        path: siteRoot,
        step: "remove_site_root"
      });

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
        await rollback(transaction, eventRecorder, siteId);
        return {
          diagnostics: {
            errors: validation.errors,
            warnings: []
          },
          events: eventRecorder.events,
          ok: false,
          transaction
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

      const runtimeEntry = await createSiteRuntimeEntryPoint(repository, siteId);
      eventRecorder.emit(ProvisioningEvent.RUNTIME_ENTRY_CREATED, {
        path: runtimeEntry.indexPath,
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
        environment,
        events: eventRecorder.events,
        metadata,
        ok: true,
        paths: {
          metadata: write.path,
          runtimeEntry: runtimeEntry.indexPath,
          root: siteRoot
        },
        siteId,
        transaction
      };
    } catch (error) {
      eventRecorder.emit(ProvisioningEvent.FAILED, {
        message: error.message,
        reason: "transaction-failed",
        siteId
      });
      await rollback(transaction, eventRecorder, siteId);

      return {
        diagnostics: {
          errors: [
            {
              code: "provision.transaction.failed",
              message: error.message
            }
          ],
          warnings: []
        },
        events: eventRecorder.events,
        ok: false,
        transaction
      };
    }
  }

  return {
    createSite,
    repository,
    version: PROVISIONING_SERVICE_VERSION
  };
}

async function rollback(transaction, eventRecorder, siteId) {
  for (const action of transaction.rollback.slice().reverse()) {
    if (action.step === "remove_site_root") {
      await rm(action.path, {
        force: true,
        recursive: true
      });
      eventRecorder.emit(ProvisioningEvent.ROLLED_BACK, {
        action: action.step,
        siteId
      });
    }
  }
}
