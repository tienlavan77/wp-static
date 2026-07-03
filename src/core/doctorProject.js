import { access } from "node:fs/promises";
import path from "node:path";
import loadConfig from "./loadConfig.js";

export default async function doctorProject(projectDir) {
  const checks = [];
  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);

  checks.push({
    name: "Node.js >= 20",
    ok: nodeMajor >= 20,
    detail: process.version
  });

  checks.push(await checkPath(path.join(projectDir, "wpsc.config.js"), "Config file"));

  let config = null;

  try {
    config = await loadConfig(projectDir);
  } catch (error) {
    checks.push({
      name: "Config load",
      ok: false,
      detail: error.message
    });

    return checks;
  }

  checks.push({
    name: "Config load",
    ok: true,
    detail: config.name
  });

  if (config.adapter?.type === "mock") {
    checks.push(await checkPath(path.resolve(projectDir, config.adapter.source), "Mock content"));
  }

  checks.push(await checkPath(path.resolve(projectDir, config.theme.layout), "Theme layout"));

  if (config.publicDir) {
    checks.push(await checkPath(path.resolve(projectDir, config.publicDir), "Public directory"));
  }

  return checks;
}

async function checkPath(targetPath, name) {
  try {
    await access(targetPath);

    return {
      name,
      ok: true,
      detail: targetPath
    };
  } catch {
    return {
      name,
      ok: false,
      detail: targetPath
    };
  }
}
