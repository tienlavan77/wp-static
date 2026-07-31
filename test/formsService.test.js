import assert from "node:assert/strict";
import test from "node:test";
import createFormsService from "../framework/src/forms/createFormsService.js";
import createCommerceRuntime from "../framework/src/runtime/commerce/createCommerceRuntime.js";

const definition = {
  fields: [
    { id: "name", label: "Name", required: true },
    { id: "email", label: "Email", required: true, type: "email" },
    { id: "message", label: "Message", required: true, type: "textarea" }
  ],
  id: "contact",
  name: "Contact us"
};

function createService(options = {}) {
  return createFormsService({
    resolveForm: async ({ formId, siteId }) => {
      assert.equal(siteId, "site-a");
      return formId === "contact" ? definition : null;
    },
    siteId: "site-a",
    ...options
  });
}

test("Forms Service exposes a stable Site-scoped form contract", async () => {
  const service = createService();
  const state = await service.read("contact");

  assert.equal(state.schema, "wpsc.form");
  assert.equal(state.siteId, "site-a");
  assert.equal(state.status, "idle");
  assert.equal(Object.isFrozen(state), true);
  assert.deepEqual(state.values, { email: "", message: "", name: "" });
});

test("Forms Service validates fields without calling the provider", async () => {
  let calls = 0;
  const service = createService({ submitForm: async () => { calls += 1; } });
  const state = await service.submit("contact", { email: "bad", name: "" });

  assert.equal(state.status, "invalid");
  assert.deepEqual(state.diagnostics.errors.map((item) => item.code), [
    "forms.field.required",
    "forms.field.invalid",
    "forms.field.required"
  ]);
  assert.equal(calls, 0);
});

test("Forms Service submits normalized values with preserved Site Context", async () => {
  const calls = [];
  const service = createService({
    submitForm: async (request) => {
      calls.push(request);
      return { id: "submission-1", ok: true };
    }
  });
  const state = await service.submit("contact", {
    email: " anh@example.com ",
    message: " Xin chao ",
    name: " Anh Tien " 
  }, { sessionId: "session-a", siteId: "site-a", userId: "user-a" });

  assert.equal(state.status, "submitted");
  assert.equal(state.response.id, "submission-1");
  assert.deepEqual(calls[0].siteContext, { sessionId: "session-a", siteId: "site-a", userId: "user-a" });
  assert.deepEqual(calls[0].values, { email: "anh@example.com", message: "Xin chao", name: "Anh Tien" });
  const mismatch = await service.submit("contact", validValues(), { siteId: "site-b" });
  assert.equal(mismatch.diagnostics.errors[0].code, "forms.context.site_mismatch");
});

function validValues() {
  return { email: "anh@example.com", message: "Hello", name: "Anh" };
}

test("Forms Runtime is a thin HTTP gateway", async () => {
  const runtime = createCommerceRuntime({
    resolveForm: async () => definition,
    siteId: "site-a",
    submitForm: async () => ({ id: "submission-1", ok: true })
  });
  const read = await runtime.handle(new Request("http://runtime.local/api/forms/contact"));
  const cookie = read.headers.get("set-cookie");
  const submitted = await runtime.handle(new Request("http://runtime.local/api/forms/contact", {
    body: JSON.stringify({ email: "anh@example.com", message: "Hello", name: "Anh" }),
    headers: { cookie },
    method: "POST"
  }));

  assert.equal(read.status, 200);
  assert.equal((await read.json()).form.id, "contact");
  assert.equal(submitted.status, 200);
  assert.equal((await submitted.json()).status, "submitted");
});
