import assert from "node:assert/strict";
import test from "node:test";
import { parseRunnerInput } from "../scripts/c048-vps-installer-acceptance.js";

test("C048 runner requires an explicit fresh target distinct from its harness", () => {
  const harness = "/opt/wpsc-harness";
  assert.deepEqual(parseRunnerInput(["--workspace", "/srv/wpsctest", "--confirm"], harness), { workspace: "/srv/wpsctest" });
  assert.deepEqual(parseRunnerInput(["--confirm", "--workspace", "/srv/wpsctest"], harness), { workspace: "/srv/wpsctest" });
  assert.throws(() => parseRunnerInput(["--confirm"], harness), /requires --confirm|requires exactly/);
  assert.throws(() => parseRunnerInput(["--workspace", harness, "--confirm"], harness), /distinct/);
  assert.throws(() => parseRunnerInput(["--workspace", "relative", "--confirm"], harness), /absolute/);
  assert.throws(() => parseRunnerInput(["--workspace", "/srv/wpsctest", "--confirm", "--extra"], harness), /requires exactly/);
});
