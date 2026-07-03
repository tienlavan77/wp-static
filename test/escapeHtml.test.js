import assert from "node:assert/strict";
import test from "node:test";
import escapeHtml from "../src/shared/escapeHtml.js";

test("escapeHtml escapes unsafe HTML characters", () => {
  assert.equal(
    escapeHtml('<script id="x">alert(\'ok\')</script>'),
    "&lt;script id=&quot;x&quot;&gt;alert(&#39;ok&#39;)&lt;/script&gt;"
  );
});
