import { access } from "node:fs/promises";
import createSitePathPolicy from "./createSitePathPolicy.js";
import createSiteRepository from "./createSiteRepository.js";

const REQUIRED_SITE_DIRECTORIES = [
  "config",
  "storage",
  "public",
  "themes",
  "plugins"
];

async function assertDirectoryExists(path, label) {
  try {
    await access(path);
  } catch {
    throw new Error(`Missing required site directory: ${label}`);
  }
}

export default function createSiteLoader(options = {}) {
  const repository = options.repository || createSiteRepository(options);

  async function load(siteId) {
    const root = repository.resolveSiteRoot(siteId);
    const metadata = await repository.readMetadata(siteId);
    const pathPolicy = createSitePathPolicy({
      siteRoot: root
    });
    const paths = {
      config: pathPolicy.resolve("config"),
      plugins: pathPolicy.resolve("plugins"),
      public: pathPolicy.resolve("public"),
      publicDist: pathPolicy.resolve("public", "dist"),
      root,
      storage: pathPolicy.resolve("storage"),
      themes: pathPolicy.resolve("themes")
    };

    for (const directory of REQUIRED_SITE_DIRECTORIES) {
      await assertDirectoryExists(pathPolicy.resolve(directory), directory);
    }

    return {
      id: siteId,
      metadata,
      paths,
      pathPolicy
    };
  }

  return {
    load,
    repository
  };
}
