import createSitePathPolicy from "./createSitePathPolicy.js";
import createSiteRepository from "./createSiteRepository.js";

export default function createSiteLoader(options = {}) {
  const repository = options.repository || createSiteRepository(options);

  async function load(siteId) {
    const root = repository.resolveSiteRoot(siteId);
    const metadata = await repository.readMetadata(siteId);
    const pathPolicy = createSitePathPolicy({
      siteRoot: root
    });

    return {
      id: siteId,
      metadata,
      paths: {
        config: pathPolicy.resolve("config"),
        plugins: pathPolicy.resolve("plugins"),
        public: pathPolicy.resolve("public"),
        publicDist: pathPolicy.resolve("public", "dist"),
        root,
        storage: pathPolicy.resolve("storage"),
        themes: pathPolicy.resolve("themes")
      },
      pathPolicy
    };
  }

  return {
    load,
    repository
  };
}
