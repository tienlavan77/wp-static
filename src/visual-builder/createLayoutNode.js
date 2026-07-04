import isPlainObject from "./isPlainObject.js";
import normalizeJsonValue from "./normalizeJsonValue.js";
import normalizeResponsiveSettings from "./normalizeResponsiveSettings.js";

function normalizeId(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeChildren(children, path, errors) {
  if (children === undefined) {
    return [];
  }

  if (!Array.isArray(children)) {
    errors.push({
      message: "Children must be an array",
      path
    });
    return [];
  }

  return children.map((child, index) => createLayoutNode(child, `${path}[${index}]`, errors));
}

export default function createLayoutNode(raw, path = "layout.sections[0]", errors = []) {
  if (!isPlainObject(raw)) {
    errors.push({
      message: "Layout node must be an object",
      path
    });
    return {
      children: [],
      id: path.replaceAll(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase(),
      settings: {},
      type: "section"
    };
  }

  const type = raw.type === "block" ? "block" : "section";
  const normalized = {
    id: normalizeId(raw.id, path.replaceAll(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()),
    settings: normalizeJsonValue(raw.settings ?? {}, `${path}.settings`, errors),
    type
  };

  if (typeof raw.label === "string" && raw.label.trim()) {
    normalized.label = raw.label.trim();
  }

  const responsive = normalizeResponsiveSettings(raw.responsive ?? {}, `${path}.responsive`, errors);
  if (Object.keys(responsive).length > 0) {
    normalized.responsive = responsive;
  }

  if (type === "block") {
    if (typeof raw.blockName !== "string" || !raw.blockName.trim()) {
      errors.push({
        message: "Block nodes require blockName",
        path: `${path}.blockName`
      });
      normalized.blockName = "core/missing";
    } else {
      normalized.blockName = raw.blockName.trim();
    }

    normalized.props = normalizeJsonValue(raw.props ?? {}, `${path}.props`, errors);
    normalized.bindings = normalizeJsonValue(raw.bindings ?? {}, `${path}.bindings`, errors);
    return normalized;
  }

  normalized.children = normalizeChildren(raw.children, `${path}.children`, errors);
  return normalized;
}
