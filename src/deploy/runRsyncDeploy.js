import { spawn } from "node:child_process";
import createRsyncDeployPlan from "./createRsyncDeployPlan.js";

export default function runRsyncDeploy(options = {}) {
  const plan = createRsyncDeployPlan(options);
  const spawnCommand = options.spawnCommand ?? spawn;

  return new Promise((resolve, reject) => {
    const child = spawnCommand(plan.command, plan.args, {
      stdio: options.stdio ?? "inherit"
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          code,
          plan
        });
        return;
      }

      reject(new Error(`Rsync deploy failed with exit code ${code}.`));
    });
  });
}
