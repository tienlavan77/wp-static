import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createProvisioningService, {
  ProvisioningEvent,
  ProvisioningStep,
  PROVISIONING_SERVICE_VERSION,
  SITE_PROVISIONING_DIRECTORIES,
  planCreateSite
} from "../src/provision/createProvisioningService.js";
import { SiteState } from "../src/site/createSiteMetadata.js";
import createSiteLoader from "../src/site/createSiteLoader.js";
import createSiteRepository from "../src/site/createSiteRepository.js";

test("createProvisioningService creates an isolated site skeleton", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-provision-"));
  const repository = createSiteRepository({
    workspaceDir
  });
  const observedEvents = [];
  const service = createProvisioningService({
    onEvent: (event) => observedEvents.push(event),
    repository
  });

  try {
    const result = await service.createSite({
      name: "Tin Sinh Phat",
      now: "2026-07-27T00:00:00.000Z",
      uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1"
    });

    assert.equal(service.version, PROVISIONING_SERVICE_VERSION);
    assert.equal(result.ok, true);
    assert.equal(result.siteId, "tin-sinh-phat");
    assert.equal(result.metadata.status, SiteState.SETUP_REQUIRED);
    assert.equal(result.metadata.uuid, "8d20de63-68f1-43cf-a28f-f62a347695a1");
    assert.deepEqual(
      result.transaction.plan.map((item) => item.step),
      [
        ProvisioningStep.VALIDATE_ENVIRONMENT,
        ProvisioningStep.CREATE_DIRECTORIES,
        ProvisioningStep.GENERATE_METADATA,
        ProvisioningStep.VALIDATE_METADATA,
        ProvisioningStep.WRITE_METADATA,
        ProvisioningStep.WRITE_RUNTIME_ENTRY
      ]
    );
    assert.deepEqual(
      result.events.map((event) => event.type),
      [
        ProvisioningEvent.STARTED,
        ProvisioningEvent.ENVIRONMENT_VALIDATED,
        ...SITE_PROVISIONING_DIRECTORIES.map(() => ProvisioningEvent.DIRECTORY_CREATED),
        ProvisioningEvent.METADATA_GENERATED,
        ProvisioningEvent.METADATA_VALIDATED,
        ProvisioningEvent.METADATA_WRITTEN,
        ProvisioningEvent.RUNTIME_ENTRY_CREATED,
        ProvisioningEvent.COMPLETED
      ]
    );
    assert.deepEqual(observedEvents, result.events);

    for (const directory of SITE_PROVISIONING_DIRECTORIES) {
      await access(path.join(workspaceDir, "sites", "tin-sinh-phat", directory));
    }
    await access(result.paths.runtimeEntry);

    const loader = createSiteLoader({
      repository
    });
    const site = await loader.load("tin-sinh-phat");
    assert.equal(site.metadata.name, "Tin Sinh Phat");
    assert.equal(site.pathPolicy.isAllowed(site.paths.publicDist), true);
  } finally {
    await rm(workspaceDir, {
      force: true,
      recursive: true
    });
  }
});

test("planCreateSite creates a stable provisioning transaction plan", () => {
  assert.deepEqual(planCreateSite("company-a"), [
    {
      siteId: "company-a",
      step: ProvisioningStep.VALIDATE_ENVIRONMENT
    },
    {
      siteId: "company-a",
      step: ProvisioningStep.CREATE_DIRECTORIES
    },
    {
      siteId: "company-a",
      step: ProvisioningStep.GENERATE_METADATA
    },
    {
      siteId: "company-a",
      step: ProvisioningStep.VALIDATE_METADATA
    },
    {
      siteId: "company-a",
      step: ProvisioningStep.WRITE_METADATA
    },
    {
      siteId: "company-a",
      step: ProvisioningStep.WRITE_RUNTIME_ENTRY
    }
  ]);
});

test("createProvisioningService rolls back site skeleton on transaction failure", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-provision-rollback-"));
  const repository = createSiteRepository({
    workspaceDir
  });
  const service = createProvisioningService({
    repository: {
      ...repository,
      writeMetadata: async () => {
        throw new Error("simulated metadata write failure");
      }
    }
  });

  try {
    const result = await service.createSite({
      name: "Rollback Site",
      uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1"
    });

    assert.equal(result.ok, false);
    assert.deepEqual(
      result.diagnostics.errors.map((error) => error.code),
      ["provision.transaction.failed"]
    );
    assert.equal(
      result.events.some((event) => event.type === ProvisioningEvent.ROLLED_BACK),
      true
    );
    await assert.rejects(
      () => access(path.join(workspaceDir, "sites", "rollback-site")),
      /ENOENT/
    );
  } finally {
    await rm(workspaceDir, {
      force: true,
      recursive: true
    });
  }
});

test("createProvisioningService reports missing site id", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-provision-missing-"));
  const service = createProvisioningService({
    workspaceDir
  });

  try {
    const result = await service.createSite({});

    assert.equal(result.ok, false);
    assert.deepEqual(
      result.events.map((event) => event.type),
      [ProvisioningEvent.FAILED]
    );
    assert.deepEqual(
      result.diagnostics.errors.map((error) => error.code),
      ["provision.site_id.required"]
    );
  } finally {
    await rm(workspaceDir, {
      force: true,
      recursive: true
    });
  }
});
