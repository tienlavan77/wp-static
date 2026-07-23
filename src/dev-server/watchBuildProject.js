import { watch } from "node:fs";
import path from "node:path";
import buildProjectOnce from "./buildProjectOnce.js";
import createWatchTargets from "../watcher/createWatchTargets.js";

export default async function watchBuildProject(projectArg, options = {}) {
  const logger = options.logger ?? console;
  const projectDir = path.resolve(projectArg);
  const state = {
    build: await runBuild(projectDir, {
      logger,
      options
    }),
    rebuilding: false,
    queued: false,
    timer: null
  };
  const targets = await createWatchTargets(state.build.config);
  const watchers = targets.map((target) => watch(target, { persistent: options.persistent ?? true }, (_eventType, filename) => {
    clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      const changedPath = filename ? path.join(target, filename.toString()) : target;
      void rebuild(path.relative(projectDir, changedPath), {
        logger,
        options,
        projectDir,
        state
      });
    }, options.debounceMs ?? 150);
  }));

  logger.info(`Watching ${targets.length} paths`);

  return {
    close() {
      clearTimeout(state.timer);

      for (const watcher of watchers) {
        watcher.close();
      }
    },
    get build() {
      return state.build;
    },
    targets,
    watchers
  };
}

async function rebuild(reason, context) {
  if (context.state.rebuilding) {
    context.state.queued = true;
    return;
  }

  context.state.rebuilding = true;

  try {
    context.logger.info(`Change detected: ${reason}`);
    context.state.build = await runBuild(context.projectDir, context);
    context.logger.info("Rebuild complete");
  } catch (error) {
    context.logger.error(`Rebuild failed: ${error.message}`);
  } finally {
    context.state.rebuilding = false;

    if (context.state.queued) {
      context.state.queued = false;
      await rebuild("queued changes", context);
    }
  }
}

async function runBuild(projectDir, context) {
  const build = await buildProjectOnce(projectDir, {
    cacheBust: Date.now(),
    changed: context.options.changed,
    disableRouteRenderCache: context.options.disableRouteRenderCache,
    freshContent: context.options.freshContent,
    onProgress: context.options.onProgress
  });

  context.logger.info(`Built ${build.sitePlan.pages.length} pages to ${build.config._paths.outputDir}`);

  return build;
}
