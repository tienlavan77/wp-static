import assert from "node:assert/strict";
import test from "node:test";
import createUserDiagnosticPresentation from "../framework/src/shared/diagnostics/createUserDiagnosticPresentation.js";
import { json } from "../framework/src/runtime/api/runtimeResponse.js";

test("user diagnostic presentation maps WooCommerce coupon errors to a recoverable action", () => {
  const presentation = createUserDiagnosticPresentation({
    code: "checkout.provider.rejected",
    detail: "woocommerce_rest_invalid_coupon",
    message: "Coupon does not exist.",
    severity: "error"
  });

  assert.deepEqual(presentation, {
    action: "Xóa hoặc đổi mã ưu đãi",
    actionId: "edit-coupon",
    message: "Mã ưu đãi không hợp lệ, đã hết hạn hoặc không áp dụng cho đơn hàng này.",
    reference: "woocommerce_rest_invalid_coupon",
    retryable: false,
    title: "Mã ưu đãi không áp dụng được"
  });
});

test("Runtime API preserves technical diagnostics and appends user presentation", async () => {
  const response = json({
    diagnostics: {
      errors: [{ code: "checkout.cart.empty", message: "Cart must contain at least one item.", severity: "error" }],
      warnings: []
    },
    ok: false
  }, { status: 400 });
  const body = await response.json();

  assert.equal(body.diagnostics.errors[0].code, "checkout.cart.empty");
  assert.equal(body.diagnostics.errors[0].message, "Cart must contain at least one item.");
  assert.equal(body.diagnostics.errors[0].presentation.actionId, "edit-cart");
  assert.equal(body.diagnostics.errors[0].presentation.reference, "checkout.cart.empty");
});
