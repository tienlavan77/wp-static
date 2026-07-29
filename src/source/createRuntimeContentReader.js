export default function createRuntimeContentReader(options = {}) {
  const adapterLoader = options.adapterLoader;
  const repository = options.repository;
  const credentialStore = options.credentialStore;
  if (!adapterLoader || typeof adapterLoader.load !== "function" || !repository || typeof repository.readSourceMetadata !== "function") throw new TypeError("Runtime Content Reader requires Adapter Loader and Site Repository.");
  return Object.freeze({
    async read({ siteId }) {
      const source = await repository.readSourceMetadata(siteId);
      const credentials = credentialStore ? await credentialStore.read(siteId) : undefined;
      const adapter = adapterLoader.load(source.sourceType, { credentials, endpoint: source.endpoint });
      const initialized = await adapter.initialize({ endpoint: source.endpoint, siteId });
      if (!initialized.ok) throw new Error(initialized.diagnostics.errors[0]?.message || "Source initialization failed.");
      const [items, collections] = await Promise.all([
        adapter.getContents(),
        typeof adapter.getCollections === "function" ? adapter.getCollections() : {}
      ]);
      return { assets: [], collections, items };
    }
  });
}
