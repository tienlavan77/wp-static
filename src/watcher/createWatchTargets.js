import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export default async function createWatchTargets(config) {
  const targets = new Set([
    path.join(config._paths.projectDir, "wpsc.config.js")
  ]);

  addIfPresent(targets, config._paths.adapterSource);
  addIfPresent(targets, config._paths.publicDir);
  addIfPresent(targets, config._paths.themeLayout);
  addIfPresent(targets, config._paths.themeComponents);
  addIfPresent(targets, config._paths.themeAssets);

  for (const layoutPath of Object.values(config._paths.themeLayouts ?? {})) {
    addIfPresent(targets, layoutPath);
  }

  return expandDirectories([...targets]);
}

async function expandDirectories(targets) {
  const expanded = new Set();

  for (const target of targets) {
    try {
      const targetStat = await stat(target);

      expanded.add(target);

      if (targetStat.isDirectory()) {
        const children = await readdir(target);

        for (const child of children) {
          const childPath = path.join(target, child);
          const childStat = await stat(childPath);

          if (childStat.isDirectory()) {
            expanded.add(childPath);
          }
        }
      }
    } catch {
      // Missing optional paths are ignored until config/content introduces them.
    }
  }

  return [...expanded].sort();
}

function addIfPresent(targets, target) {
  if (target) {
    targets.add(target);
  }
}
