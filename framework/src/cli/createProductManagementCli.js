import deepFreeze from "../shared/deepFreeze.js";

export default function createProductManagementCli(options = {}) {
  const { backup, deployment, operations, product, registry, runtime, update } = options;
  if (!operations?.list || !registry?.read || !backup?.list || !deployment?.status) throw new TypeError("Product CLI requires Product Operations services.");

  async function run(args = []) {
    const json = args.includes("--json");
    const command = args.filter((arg) => arg !== "--json");
    let result;
    if (command[0] === "status") result = { product, registry: await registry.read(), runtime: runtime?.state?.() ?? null };
    else if (command[0] === "site" && command[1] === "list") result = await operations.list();
    else if (command[0] === "site" && command[1] === "inspect" && command[2]) result = await operations.inspect(command[2]);
    else if (command[0] === "backup" && command[1] === "list" && command[2]) result = await backup.list(command[2]);
    else if (command[0] === "deployment" && command[1] === "list" && command[2]) result = await deployment.status(command[2]);
    else if (command[0] === "runtime" && command[1] === "status") result = runtime?.state?.() ?? { readiness: "unknown" };
    else if (command[0] === "update" && command[1] === "check" && update?.check) result = await update.check();
    else if (command[0] === "update" && command[1] === "plan" && update?.plan) result = await update.plan();
    else if (command[0] === "update" && command.length === 1 && update?.run) result = await update.run();
    else if (command[0] === "update" && command[1] === "status" && update?.status) result = await update.status();
    else if (command[0] === "update" && command[1] === "history" && update?.history) result = await update.history();
    else return deepFreeze({ code: 2, output: "Unknown Product command.", result: null });
    const ok = result?.ok !== false;
    return deepFreeze({ code: ok ? 0 : 1, output: json ? JSON.stringify(result, null, 2) : format(result), result });
  }
  return Object.freeze({ run });
}

function format(result) {
  if (result?.sites) return result.sites.map((site) => `${site.id}\t${site.status}\t${site.name}`).join("\n");
  if (result?.site) return `${result.site.id}\t${result.site.status}\t${result.site.name}`;
  if (result?.backups) return result.backups.map((backup) => `${backup.backupId}\t${backup.createdAt}`).join("\n");
  if (result?.deployments) return result.deployments.map((deployment) => `${deployment.deploymentId}\t${deployment.state}\t${deployment.artifactId}`).join("\n");
  if (result?.readiness) return `Runtime: ${result.readiness}`;
  if (result?.status === "UPDATE_AVAILABLE") return `Current: ${result.currentVersion}\nAvailable: ${result.available.version}\nStatus: UPDATE_AVAILABLE`;
  if (result?.status === "UP_TO_DATE") return `Current: ${result.currentVersion}\nStatus: UP_TO_DATE`;
  return JSON.stringify(result, null, 2);
}
