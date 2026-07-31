import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createSiteMetadata from "../framework/src/site/createSiteMetadata.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

test("createSiteRepository resolves site metadata inside workspace sites", () => {
  const repository = createSiteRepository({
    workspaceDir: "/workspace"
  });

  assert.equal(
    repository.resolveMetadataPath("tinsinhphat"),
    path.join("/workspace", "sites", "tinsinhphat", "config", "site.json")
  );
});

test("createSiteRepository reads and writes metadata", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-site-repository-"));
  const repository = createSiteRepository({
    workspaceDir
  });
  const metadata = createSiteMetadata({
    name: "tinsinhphat",
    status: "SETUP_REQUIRED",
    uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1"
  });

  try {
    const write = await repository.writeMetadata("tinsinhphat", metadata);
    const raw = await readFile(write.path, "utf8");
    const read = await repository.readMetadata("tinsinhphat");

    assert.match(raw, /"name": "tinsinhphat"/);
    assert.deepEqual(read, metadata);
  } finally {
    await rm(workspaceDir, {
      force: true,
      recursive: true
    });
  }
});

test("createSiteRepository rejects unsafe site ids", () => {
  const repository = createSiteRepository({
    workspaceDir: "/workspace"
  });

  assert.throws(
    () => repository.resolveSiteRoot("../other-site"),
    /Invalid site id/
  );
  assert.throws(
    () => repository.resolveSiteRoot("bad/site"),
    /Invalid site id/
  );
});
