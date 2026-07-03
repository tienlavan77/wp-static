import assert from "node:assert/strict";
import test from "node:test";
import deepFreeze from "../src/shared/deepFreeze.js";

test("deepFreeze freezes nested objects", () => {
  const value = deepFreeze({
    nested: {
      enabled: true
    }
  });

  assert.equal(Object.isFrozen(value), true);
  assert.equal(Object.isFrozen(value.nested), true);
});
