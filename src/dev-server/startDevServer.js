import { watch } from "node:fs";
import path from "node:path";
import buildProjectOnce from "./buildProjectOnce.js";
import createWatchTargets from "./createWatchTargets.js";
import serveStatic from "./serveStatic.js";

export default async function startDevServer(projectArg, options = {}) {
  const port = options.port ?? 8080;
  const logger = options.logger ?? console;
  const watchEnabled = options.watch !== false;
  let buildState = await runBuild(projectArg, logger);
  const server = serveStatic(buildState.config._paths.outputDir, {
    liveReload: true,
    port
  });
  const watchers = [];
  const reload = server.reload ?? (() => {});
  let rebuildTimer = null;
  let rebuilding = false;
  let queued = false;

  async function rebuild(reason) {
    if (rebuilding) {
      queued = true;
      return;
    }

    rebuilding = true;

    try {
      logger.info(`Change detected: ${reason}`);
      buildState = await runBuild(projectArg, logger);
      reload();
      logger.info("Rebuild complete");
    } catch (error) {
      logger.error(`Rebuild failed: ${error.message}`);
    } finally {
      rebuilding = false;

      if (queued) {
        queued = false;
        await rebuild("queued changes");
      }
    }
  }

  if (watchEnabled) {
    const targets = await createWatchTargets(buildState.config);

    for (const target of targets) {
      watchers.push(watch(target, { persistent: true }, (_eventType, filename) => {
        clearTimeout(rebuildTimer);
        rebuildTimer = setTimeout(() => {
          const changedPath = filename ? path.join(target, filename.toString()) : target;
          void rebuild(path.relative(buildState.projectDir, changedPath));
        }, options.debounceMs ?? 150);
      }));
    }

    logger.info(`Watching ${targets.length} paths`);
  }

  return {
    close() {
      clearTimeout(rebuildTimer);

      for (const watcher of watchers) {
        watcher.close();
      }

      server.close();
    },
    get config() {
      return buildState.config;
    },
    server
  };
}

async function runBuild(projectArg, logger) {
  const state = await buildProjectOnce(projectArg, {
    cacheBust: Date.now()
  });

  logger.info(`Built ${state.sitePlan.pages.length} pages to ${state.config._paths.outputDir}`);

  return state;
}
