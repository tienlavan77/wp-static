import deepFreeze from "../shared/deepFreeze.js";

export const OPERATIONS_AUTHORIZATION_SCHEMA = "wpsc.operations-authorization";
export const OPERATIONS_AUTHORIZATION_VERSION = 1;
export const OperationsCapability = Object.freeze({
  BACKUP: "backup",
  BUILD_OPERATION: "build.operation",
  DEPLOYMENT: "deployment",
  EXTENSION_ADMINISTRATION: "extension.administration",
  MULTI_SITE_ADMINISTRATION: "multi_site.administration",
  RESTORE: "restore",
  SECURITY_ADMINISTRATION: "security.administration",
  SITE_CONFIGURATION: "site.configuration",
  SITE_INSPECTION: "site.inspection"
});

export default function createOperationsAuthorizationService(options = {}) {
  const audit = options.audit;
  if (!audit?.audit) throw new TypeError("Operations Authorization requires an Audit Trail.");
  const policy = options.policy ?? createGrantPolicy(options.grants ?? []);

  async function authorize(input = {}) {
    const request = normalizeRequest(input);
    let decision;
    try { decision = normalizeDecision(await policy(request)); } catch (error) { decision = { allowed: false, reason: "policy-error" }; }
    const result = deepFreeze({
      allowed: decision.allowed,
      capability: request.capability,
      diagnostics: decision.allowed ? { errors: [], warnings: [] } : { errors: [{ code: "operations.authorization.denied", message: "Operator is not authorized for this Site operation.", severity: "error" }], warnings: [] },
      operator: request.operator,
      reason: decision.reason ?? null,
      schema: OPERATIONS_AUTHORIZATION_SCHEMA,
      schemaVersion: OPERATIONS_AUTHORIZATION_VERSION,
      siteId: request.siteId
    });
    await audit.audit({
      actor: { id: request.operator.id, type: request.operator.type },
      correlationId: request.correlationId,
      operation: `authorization.${request.capability}`,
      outcome: decision.allowed ? "succeeded" : "failed",
      service: "operations-authorization",
      siteId: request.siteId,
      target: { capability: request.capability, reason: decision.reason ?? null }
    });
    return result;
  }

  async function execute(input, operation) {
    const authorization = await authorize(input);
    if (!authorization.allowed) return authorization;
    if (typeof operation !== "function") throw new TypeError("Authorized operation must be a function.");
    return operation(deepFreeze({ capability: authorization.capability, operator: authorization.operator, siteId: authorization.siteId }));
  }

  return Object.freeze({ authorize, execute });
}

function createGrantPolicy(grants) {
  const normalized = grants.map((grant) => ({ actorId: String(grant.actorId ?? ""), capabilities: new Set(grant.capabilities ?? []), siteIds: new Set(grant.siteIds ?? []) }));
  return ({ capability, operator, siteId }) => normalized.some((grant) => {
    if (grant.actorId !== operator.id || !grant.capabilities.has(capability)) return false;
    return grant.siteIds.has(siteId) || (capability === OperationsCapability.MULTI_SITE_ADMINISTRATION && grant.siteIds.has("*"));
  });
}

function normalizeRequest(input) {
  const capability = String(input.capability ?? "");
  if (!Object.values(OperationsCapability).includes(capability)) throw new TypeError("Unsupported operations capability.");
  const siteId = String(input.siteId ?? "").trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(siteId)) throw new TypeError("Operations authorization requires a valid Site id.");
  const id = String(input.operator?.id ?? "").trim();
  if (!id) throw new TypeError("Operations authorization requires an operator identity.");
  return { capability, correlationId: input.correlationId ?? null, operator: { id, type: String(input.operator?.type ?? "operator") }, siteId };
}
function normalizeDecision(value) { if (typeof value === "boolean") return { allowed: value }; return { allowed: value?.allowed === true, reason: value?.reason ?? null }; }
