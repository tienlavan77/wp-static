import { normalizeText } from "../shared/text.js";

export function sameVariantValue(left, right) {
  return normalizeText(left).replace(/\s+/g, "") === normalizeText(right).replace(/\s+/g, "");
}

export function isQuantityAttribute(attributeKey, labelText) {
  return normalizeText(attributeKey).indexOf("so-luong") !== -1 ||
    normalizeText(attributeKey).indexOf("quantity") !== -1 ||
    normalizeText(labelText).indexOf("so luong") !== -1 ||
    normalizeText(labelText).indexOf("quantity") !== -1;
}
