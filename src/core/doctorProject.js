import path from "node:path";
import loadConfig from "./loadConfig.js";
import {
  checkNodeVersion,
  checkPhpVersion,
  checkReadablePath,
  checkWritableDirectory
} from "../validation/checkEnvironment.js";
import {
  createError,
  createOk
} from "../validation/createValidationResult.js";

export default async function doctorProject(projectDir) {
  const checks = [];
  checks.push(await checkNodeVersion());
  checks.push(await checkPhpVersion());
  checks.push(await checkReadablePath(path.join(projectDir, "wpsc.config.js"), "Config file", {
    fix: "Run the install wizard or create wpsc.config.js in the project root."
  }));

  let config = null;

  try {
    config = await loadConfig(projectDir);
  } catch (error) {
    checks.push(createError("Config load", error.message, {
      category: "config",
      fix: "Fix the config error above, then run wpsc doctor again.",
      summary: "WPSC could not load project config."
    }));

    return checks;
  }

  checks.push(createOk("Config load", config.name, {
    category: "config",
    summary: `Loaded project config: ${config.name}.`
  }));

  if (config.adapter?.type === "mock") {
    checks.push(await checkReadablePath(path.resolve(projectDir, config.adapter.source), "Mock content"));
  }

  checks.push(await checkReadablePath(path.resolve(projectDir, config.theme.layout), "Theme layout", {
    category: "theme",
    fix: "Check theme.layout in wpsc.config.js and make sure the layout file exists."
  }));

  if (config.publicDir) {
    checks.push(await checkReadablePath(path.resolve(projectDir, config.publicDir), "Public directory"));
  }

  checks.push(await checkWritableDirectory(path.resolve(projectDir, config.outputDir), "Output directory", {
    category: "output"
  }));

  return checks;
}
