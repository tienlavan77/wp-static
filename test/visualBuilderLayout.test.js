import assert from "node:assert/strict";
import test from "node:test";
import createContentTypeLayoutIndex from "../framework/src/builder/visual-builder/createContentTypeLayoutIndex.js";
import createLayoutDocument, { validateLayoutDocument } from "../framework/src/builder/visual-builder/createLayoutDocument.js";
import normalizeResponsiveSettings from "../framework/src/builder/visual-builder/normalizeResponsiveSettings.js";

test("createLayoutDocument normalizes layout JSON documents", () => {
  const layout = createLayoutDocument({
    contentTypes: ["page", "product"],
    id: "home",
    name: "Home Layout",
    sections: [{
      id: "hero",
      label: "Hero",
      settings: {
        width: "full"
      }
    }]
  });

  assert.equal(layout.id, "home");
  assert.equal(layout.version, 1);
  assert.deepEqual(layout.contentTypes, ["page", "product"]);
  assert.equal(layout.sections[0].type, "section");
});

test("createContentTypeLayoutIndex resolves documents by content type", () => {
  const index = createContentTypeLayoutIndex([{
    contentTypes: ["page"],
    id: "page-layout",
    sections: []
  }, {
    contentTypes: ["default"],
    id: "fallback-layout",
    sections: []
  }]);

  assert.equal(index.find("page").id, "page-layout");
  assert.equal(index.find("post").id, "fallback-layout");
  assert.equal(index.has("page"), true);
});

test("layout nodes support nested sections and block components", () => {
  const layout = createLayoutDocument({
    contentTypes: ["product"],
    id: "product-detail",
    sections: [{
      id: "main",
      children: [{
        id: "summary",
        type: "section",
        children: [{
          blockName: "commerce/product-price",
          id: "price",
          props: {
            currency: "VND"
          },
          type: "block"
        }]
      }]
    }]
  });

  const block = layout.sections[0].children[0].children[0];
  assert.equal(block.type, "block");
  assert.equal(block.blockName, "commerce/product-price");
  assert.deepEqual(block.props, {
    currency: "VND"
  });
});

test("normalizeResponsiveSettings keeps breakpoint scoped settings", () => {
  const errors = [];
  const responsive = normalizeResponsiveSettings({
    desktop: {
      columns: 4
    },
    mobile: {
      hidden: true,
      order: 2
    }
  }, "layout.sections[0].responsive", errors);

  assert.deepEqual(errors, []);
  assert.equal(responsive.mobile.hidden, true);
  assert.equal(responsive.desktop.columns, 4);
});

test("validateLayoutDocument reports invalid layout data", () => {
  const result = validateLayoutDocument({
    contentTypes: [],
    sections: [{
      type: "block"
    }]
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.map((error) => error.message).join(" "), /content type/);
  assert.match(result.errors.map((error) => error.message).join(" "), /blockName/);
});

test("createContentTypeLayoutIndex rejects duplicate mappings", () => {
  assert.throws(() => createContentTypeLayoutIndex([{
    contentTypes: ["page"],
    id: "one",
    sections: []
  }, {
    contentTypes: ["page"],
    id: "two",
    sections: []
  }]), /Duplicate layout mapping/);
});
