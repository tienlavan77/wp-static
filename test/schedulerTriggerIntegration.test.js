import assert from "node:assert/strict";
import test from "node:test";
import createBuildApi from "../framework/src/api/createBuildApi.js";
import createSiteBuildCommand from "../framework/src/cli/createSiteBuildCommand.js";
import createSchedulerWebhookReceiver from "../framework/src/webhook/createSchedulerWebhookReceiver.js";
import { JobTrigger } from "../framework/src/scheduler/contracts/schedulerContracts.js";

function scheduler(calls) { return { trigger: (input) => { calls.push(input); return { diagnostics: { errors: [], warnings: [] }, job: { id: `job-${calls.length}` }, ok: true }; } }; }

test("Browser API and CLI submit build triggers exclusively through Scheduler", () => {
  const calls = [];
  const api = createBuildApi({ scheduler: scheduler(calls) });
  const command = createSiteBuildCommand({ scheduler: scheduler(calls), write: () => {} });
  assert.equal(api.build({ siteId: "company-a" }).ok, true);
  assert.equal(command.run({ siteId: "company-b" }).ok, true);
  assert.deepEqual(calls, [{ siteId: "company-a", triggerType: JobTrigger.BROWSER }, { siteId: "company-b", triggerType: JobTrigger.CLI }]);
});

test("Webhook receiver submits a webhook trigger through Scheduler", async () => {
  const calls = [];
  const receiver = createSchedulerWebhookReceiver({ scheduler: scheduler(calls) });
  const response = await receiver.handle({ json: async () => ({ siteId: "company-a" }), method: "POST" });
  assert.equal(response.status, 202);
  assert.deepEqual(calls, [{ siteId: "company-a", triggerType: JobTrigger.WEBHOOK }]);
});
