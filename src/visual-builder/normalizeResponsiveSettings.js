import isPlainObject from "./isPlainObject.js";
import normalizeJsonValue from "./normalizeJsonValue.js";

export const RESPONSIVE_BREAKPOINTS = ["mobile", "tablet", "desktop"];

export default function normalizeResponsiveSettings(value = {}, path = "layout.responsive", errors = []) {
  if (value === undefined) {
    return {};
  }

  if (!isPlainObject(value)) {
    errors.push({
      message: "Responsive settings must be an object",
      path
    });
    return {};
  }

  const normalized = {};

  for (const [breakpoint, settings] of Object.entries(value)) {
    if (!RESPONSIVE_BREAKPOINTS.includes(breakpoint)) {
      errors.push({
        message: `Unsupported breakpoint "${breakpoint}"`,
        path: `${path}.${breakpoint}`
      });
      continue;
    }

    if (!isPlainObject(settings)) {
      errors.push({
        message: "Breakpoint settings must be an object",
        path: `${path}.${breakpoint}`
      });
      continue;
    }

    normalized[breakpoint] = normalizeJsonValue(settings, `${path}.${breakpoint}`, errors);
  }

  return normalized;
}
