export const RUNTIME_SERVE_COMMAND_VERSION = "1.0";

export default function createRuntimeServeCommand(options = {}) {
  const createHttpServer = options.createHttpServer;
  const createRuntimeInstance = options.createRuntimeInstance;
  const loadRuntimeConfig = options.loadRuntimeConfig;
  const write = options.write || (() => {});
  if (typeof createHttpServer !== "function" || typeof createRuntimeInstance !== "function" || typeof loadRuntimeConfig !== "function") throw new TypeError("Runtime serve command requires config loader, runtime instance, and HTTP server.");
  return Object.freeze({
    async run(input = {}) {
      const loaded = await loadRuntimeConfig({ configPath: input.configPath, workspaceDir: input.workspaceDir });
      if (!loaded.ok) return loaded;
      const instance = createRuntimeInstance({ ...loaded.config, workspaceDir: loaded.workspaceDir });
      const server = createHttpServer({ router: instance.router });
      const port = Number(input.port || 8787);
      const host = input.host || "127.0.0.1";
      await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, host, resolve); });
      write(`WPSC Site Runtime listening at http://${host}:${port}`);
      return { configPath: loaded.configPath, instance, ok: true, server, url: `http://${host}:${port}` };
    },
    version: RUNTIME_SERVE_COMMAND_VERSION
  });
}
