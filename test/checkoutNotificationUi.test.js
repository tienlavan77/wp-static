import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("checkout notification is full-width and provides coupon recovery actions", async () => {
  const source = await readFile("framework/src/runtime/browser/enhanced-navigation.js", "utf8");
  const css = await readFile("themes/storefront/storefront.css", "utf8");

  assert.match(source, /renderCheckoutSteps\(2\)[\s\S]*data-checkout-notification/);
  assert.match(source, /data-checkout-notification-action="remove-coupon"/);
  assert.match(source, /data-checkout-notification-action="replace-coupon"/);
  assert.match(source, /focusCheckoutCoupon\(\)/);
  assert.match(css, /\.storefront-checkout-notification \{[\s\S]*width: 100%/);
  assert.match(css, /\.storefront-checkout-notification__actions \{[\s\S]*justify-content: flex-end/);
});
