import { PrivilegedInstallationOperation } from "./installationContract.js";

export default function createPrivilegedInstallationExecutor(options = {}) {
  const handlers = options.handlers ?? {};
  async function execute(plan) {
    const results = [];
    for (const operation of plan.operations ?? []) {
      if (!Object.values(PrivilegedInstallationOperation).includes(operation.type)) throw new TypeError(`Privileged Installation operation is not allowed: ${operation.type}.`);
      if (plan.dryRun) { results.push({ executed: false, type: operation.type }); continue; }
      const handler = handlers[operation.type];
      if (typeof handler !== "function") throw new TypeError(`No privileged handler is registered for ${operation.type}.`);
      results.push({ executed: true, result: await handler(operation.arguments), type: operation.type });
    }
    return Object.freeze({ results: Object.freeze(results) });
  }
  return Object.freeze({ execute });
}
