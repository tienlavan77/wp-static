import assert from "node:assert/strict";
import test from "node:test";
import createContentValidationReport from "../framework/src/builder/report/createContentValidationReport.js";

test("createContentValidationReport reports duplicate routes", () => {
  const report = createContentValidationReport({
    routes: [
      {
        content: {
          id: "product-1",
          slug: "iphone-15"
        },
        path: "/iphone-15"
      },
      {
        content: {
          id: "term-1",
          slug: "iphone-15"
        },
        path: "/iphone-15"
      }
    ]
  });

  assert.equal(report.ok, false);
  assert.equal(report.issueCount, 1);
  assert.equal(report.issues[0].code, "duplicate-route");
});
