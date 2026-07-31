import deepFreeze from "../shared/deepFreeze.js";

export const PRODUCT_PROFILE_SCHEMA = "wpsc.product-profile";
export const PRODUCT_PROFILE_VERSION = 1;
export const ProductProfile = Object.freeze({ PERSONAL: "personal" });

const PERSONAL_DEFAULTS = Object.freeze({
  features: { core: "full" },
  limits: { operators: 1, sites: 1 },
  mode: "local-single-instance",
  onboarding: ["bootstrap", "create-site", "connect-source", "build-site", "deploy-site"],
  profile: ProductProfile.PERSONAL
});

export default function createPersonalEditionProfileService(options = {}) {
  const registry = options.registry;
  if (!registry?.listSites) throw new TypeError("Personal Edition Profile requires a Site Registry.");

  function create(input = {}) {
    const profile = deepFreeze({
      ...PERSONAL_DEFAULTS,
      features: { ...PERSONAL_DEFAULTS.features, ...(input.features ?? {}) },
      limits: { ...PERSONAL_DEFAULTS.limits, ...(input.limits ?? {}) },
      schema: PRODUCT_PROFILE_SCHEMA,
      schemaVersion: PRODUCT_PROFILE_VERSION
    });
    const validation = validate(profile);
    if (!validation.ok) throw new TypeError(validation.errors.map((error) => error.message).join(" "));
    return profile;
  }

  async function assess(input = {}) {
    const profile = input.profile ?? create();
    const sites = await registry.listSites();
    const operatorCount = Number(input.operatorCount ?? 1);
    const siteAllowed = sites.length < profile.limits.sites;
    const operatorsAllowed = operatorCount <= profile.limits.operators;
    return deepFreeze({
      allowed: siteAllowed && operatorsAllowed,
      diagnostics: {
        errors: [],
        warnings: [
          ...(siteAllowed ? [] : [issue("profile.personal.site_limit.reached", "Personal profile Site limit has been reached.", "warning")]),
          ...(operatorsAllowed ? [] : [issue("profile.personal.operator_limit.reached", "Personal profile Operator limit has been reached.", "warning")])
        ]
      },
      onboarding: [...profile.onboarding],
      profile,
      usage: { operators: operatorCount, sites: sites.length }
    });
  }

  function validate(profile = {}) {
    const errors = [];
    if (profile.schema !== PRODUCT_PROFILE_SCHEMA || profile.schemaVersion !== PRODUCT_PROFILE_VERSION) errors.push(issue("profile.schema.invalid", "Product Profile schema is invalid."));
    if (profile.profile !== ProductProfile.PERSONAL) errors.push(issue("profile.type.invalid", "Unsupported Product Profile."));
    for (const name of ["sites", "operators"]) if (!Number.isInteger(profile.limits?.[name]) || profile.limits[name] < 1) errors.push(issue("profile.limit.invalid", `Profile ${name} limit must be at least one.`, "error", name));
    if (profile.features?.core !== "full") errors.push(issue("profile.core.invalid", "Personal Profile must keep Full Core enabled."));
    return { errors, ok: errors.length === 0 };
  }

  return Object.freeze({ assess, create, validate });
}

function issue(code, message, severity = "error", field = null) { return { code, field, message, severity }; }
