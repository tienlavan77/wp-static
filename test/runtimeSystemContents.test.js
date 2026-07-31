import assert from "node:assert/strict";
import test from "node:test";
import createRoutes from "../framework/src/builder/router/createRoutes.js";
import parseChangedItem from "../framework/src/builder/planner/parseChangedItem.js";
import planIncrementalBuild from "../framework/src/builder/planner/planIncrementalBuild.js";
import createRuntimeSystemContents from "../framework/src/runtime/bootstrap/createRuntimeSystemContents.js";

test("Runtime system contents include the browser thank-you route", () => {
  const contents = createRuntimeSystemContents([]);
  const thankYou = contents.find((content) => content.id === "runtime:thank-you");

  assert.deepEqual(thankYou, {
    data: {},
    domain: "runtime",
    id: "runtime:thank-you",
    slug: "thank-you",
    status: "published",
    title: "Cảm ơn anh đã đặt hàng",
    type: "page"
  });
});

test("Runtime system routes never replace a source-owned thank-you page", () => {
  const contents = createRuntimeSystemContents([{ id: "page-1", slug: "thank-you", title: "Custom", type: "page" }]);

  assert.equal(contents.filter((content) => content.slug === "thank-you").length, 1);
  assert.equal(contents.find((content) => content.slug === "thank-you").id, "page-1");
});

test("thank-you and checkout can be published together as an incremental route build", () => {
  const contents = createRuntimeSystemContents([
    { id: "page-checkout", slug: "checkout", title: "Checkout", type: "page" }
  ]);
  const routes = createRoutes(contents);
  const sitePlan = {
    pages: routes.map((route) => ({ route })),
    routes,
    theme: { metadata: {} }
  };
  const incremental = planIncrementalBuild(sitePlan, [
    parseChangedItem("page:checkout"),
    parseChangedItem("page:thank-you")
  ]);

  assert.equal(incremental.fullBuild, false);
  assert.deepEqual(incremental.changedRoutes, ["/checkout", "/thank-you"]);
  assert.equal(incremental.affectedPages.length, 2);
});
