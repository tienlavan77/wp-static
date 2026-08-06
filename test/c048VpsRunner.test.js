import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, chmod } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertProvisionedNode, parseRunnerInput } from "../scripts/c048-vps-installer-acceptance.js";

test("C048 runner requires an explicit fresh target distinct from its harness", () => {
  const harness = "/opt/wpsc-harness";
  assert.deepEqual(parseRunnerInput(["--workspace", "/srv/wpsctest", "--confirm"], harness), { workspace: "/srv/wpsctest" });
  assert.deepEqual(parseRunnerInput(["--confirm", "--workspace", "/srv/wpsctest"], harness), { workspace: "/srv/wpsctest" });
  assert.throws(() => parseRunnerInput(["--confirm"], harness), /requires --confirm|requires exactly/);
  assert.throws(() => parseRunnerInput(["--workspace", harness, "--confirm"], harness), /distinct/);
  assert.throws(() => parseRunnerInput(["--workspace", "relative", "--confirm"], harness), /absolute/);
  assert.throws(() => parseRunnerInput(["--workspace", "/srv/wpsctest", "--confirm", "--extra"], harness), /requires exactly/);
});

test("C048 requires executable Node provisioned by C039 before acceptance", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "wpsc-c048-node-"));
  await assert.rejects(assertProvisionedNode(workspace), /C039-provisioned executable Node/);
  const nodePath = path.join(workspace, "runtime", "node", "bin", "node");
  await mkdir(path.dirname(nodePath), { recursive: true });
  await writeFile(nodePath, "#!/bin/sh\n");
  await chmod(nodePath, 0o755);
  assert.equal(await assertProvisionedNode(workspace), nodePath);
});
