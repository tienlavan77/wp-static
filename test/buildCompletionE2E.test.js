import assert from "node:assert/strict";
import test from "node:test";
import createJobQueue from "../framework/src/scheduler/queue/createJobQueue.js";
import { JobStatus, JobTrigger } from "../framework/src/scheduler/contracts/schedulerContracts.js";
import createRouteDependencyGraph from "../framework/src/builder/graph/createRouteDependencyGraph.js";
import parseChangedItem from "../framework/src/builder/planner/parseChangedItem.js";

test("C026 E2E: ten webhook changes coalesce into one pending Build and retain latest entities", () => {
  const queue = createJobQueue({ createJobId: () => "job-1" });
  for (const changed of ["product:a", "product:b", "product:a", "product:c", "product:b", "product:d", "product:a", "product:e", "product:d", "product:b"]) {
    queue.enqueue({ changed: [changed], changes: [{ entityId: changed.split(":")[1], entityType: "product", revision: changed }], siteId: "site-a", triggerType: JobTrigger.WEBHOOK });
  }
  const jobs = queue.list(JobStatus.QUEUED);
  assert.equal(jobs.length, 1);
  assert.deepEqual([...jobs[0].changed].sort(), ["product:a", "product:b", "product:c", "product:d", "product:e"]);
  assert.equal(jobs[0].changes.length, 5);
});

test("C026 E2E: a running Site rejects a new webhook Build without replacing its active snapshot", () => {
  const queue = createJobQueue({ createJobId: () => "job-1" });
  queue.enqueue({ changed: ["product:a"], siteId: "site-a", triggerType: JobTrigger.WEBHOOK });
  const active = queue.next();
  const next = queue.enqueue({ changed: ["product:b"], siteId: "site-a", triggerType: JobTrigger.WEBHOOK });
  assert.equal(active.status, JobStatus.RUNNING);
  assert.equal(next.ok, false);
  assert.deepEqual(queue.list(JobStatus.RUNNING)[0].changed, ["product:a"]);
});

test("C026 E2E: Product mutation includes Product route, Homepage embedded card, and Product archive", () => {
  const product = { data: { terms: [{ id: 8, slug: "printing", taxonomy: "product_cat" }] }, id: "1747", slug: "catalogue", type: "product" };
  const plan = { routes: [
    { content: product, outputPath: "catalogue.html", path: "/catalogue" },
    { content: { data: { featuredProducts: [{ id: "1747", slug: "catalogue", type: "product" }] }, id: "home", slug: "home", type: "page" }, outputPath: "index.html", path: "/" },
    { content: { data: { items: [product], term: { id: 8, slug: "printing", taxonomy: "product_cat" } }, id: "archive", slug: "printing", type: "archive:product_cat" }, outputPath: "printing.html", path: "/printing" }
  ] };
  const affected = createRouteDependencyGraph(plan).findAffectedRoutes([parseChangedItem("product:catalogue")]);
  assert.deepEqual(affected.sort(), ["/", "/catalogue", "/printing"]);
});
