import assert from "node:assert/strict";
import test from "node:test";
import createSiteSetupCommand, {
  SITE_SETUP_COMMAND_VERSION
} from "../framework/src/cli/createSiteSetupCommand.js";
import createSetupService, { SetupClient } from "../framework/src/setup/createSetupService.js";
import { SetupState } from "../framework/src/setup/createSetupStateMachine.js";

test("site setup command calls Setup Service directly and writes service progress", async () => {
  const output = [];
  const service = createSetupService({
    createSessionId: () => "cli-setup-session",
    now: () => "2026-07-28T00:00:00.000Z"
  });
  const command = createSiteSetupCommand({
    setupService: service,
    write: (line) => output.push(line)
  });
  const result = await command.run({ siteId: "company-a" });

  assert.equal(command.version, SITE_SETUP_COMMAND_VERSION);
  assert.equal(result.ok, true);
  assert.equal(service.getSession(result.session.id).session.context.client, SetupClient.CLI);
  assert.equal(result.session.currentStateId, SetupState.NOT_STARTED);
  assert.match(output[0], /Setup company-a: Setup is ready to begin \(0%, revision 0\)/);
});

test("site setup command advances only through the Setup Service", async () => {
  const output = [];
  const command = createSiteSetupCommand({
    setupService: createSetupService({
      createSessionId: () => "cli-advance-session",
      now: () => "2026-07-28T00:00:00.000Z"
    }),
    write: (line) => output.push(line)
  });
  const result = await command.run({ advance: true, siteId: "company-a" });

  assert.equal(result.ok, true);
  assert.equal(result.session.currentStateId, SetupState.VALIDATING);
  assert.match(output[0], /Validating environment/);
});

test("site setup command renders Setup Service diagnostics without translating them", async () => {
  const output = [];
  const result = await createSiteSetupCommand({
    setupService: createSetupService(),
    write: (line) => output.push(line)
  }).run({});

  assert.equal(result.ok, false);
  assert.match(output[0], /setup.context.site_id.required/);
  assert.match(output[0], /Setup context site id is required/);
});
