import createSiteContext, { assertSiteContext } from "../../site/createSiteContext.js";
import parseChangedItem from "../../builder/planner/parseChangedItem.js";

export default function createRuntimeContentReader(options = {}) {
  const adapterLoader = options.adapterLoader;
  const repository = options.repository;
  const credentialStore = options.credentialStore;
  if (!adapterLoader || typeof adapterLoader.load !== "function" || !repository || typeof repository.readSourceMetadata !== "function") throw new TypeError("Runtime Content Reader requires Adapter Loader and Site Repository.");
  return Object.freeze({
    async read({ changed = [], dependencyManifest, siteContext: providedContext, siteId, sourceSnapshot }) {
      const siteContext = providedContext
        ? assertSiteContext(providedContext)
        : createSiteContext({ siteId });
      if (siteId !== undefined) siteContext.assertSite(siteId);
      siteId = siteContext.siteId;
      const source = await repository.readSourceMetadata(siteId);
      const credentials = credentialStore ? await credentialStore.read(siteId) : undefined;
      const adapter = adapterLoader.load(source.sourceType, { credentials, endpoint: source.endpoint });
      const initialized = await adapter.initialize({ endpoint: source.endpoint, siteId });
      if (!initialized.ok) throw new Error(initialized.diagnostics.errors[0]?.message || "Source initialization failed.");
      const targeted = await readTargeted({ adapter, changed, dependencyManifest, sourceSnapshot });
      if (targeted) return { assets: [], collections: sourceSnapshot.collections, items: targeted, mode: "targeted", siteContext };
      const [items, collections] = await Promise.all([adapter.getContents(), typeof adapter.getCollections === "function" ? adapter.getCollections() : {}]);
      return { assets: [], collections, items, mode: "full", siteContext };
    }
  });
}

async function readTargeted({ adapter, changed, dependencyManifest, sourceSnapshot }) {
  if (!Array.isArray(changed) || changed.length === 0
    || !dependencyManifest?.buildId
    || dependencyManifest.buildId !== sourceSnapshot?.buildId
    || typeof adapter.getContentsByChanges !== "function") return null;
  let changes;
  try { changes = changed.map(parseChangedItem); } catch { return null; }
  // Taxonomy/menu/media/site events need a refreshed collection view. C018 only
  // targets independently fetchable content; all other cases remain full-safe.
  if (changes.some((change) => !["page", "post", "product"].includes(change.type))) return null;
  const updates = await adapter.getContentsByChanges(changes);
  if (!Array.isArray(updates) || updates.length !== changes.length) return null;
  const items = [...sourceSnapshot.items];
  for (const change of changes) {
    const update = updates.find((item) => item?.type === change.type && (String(item.id) === String(change.id) || item.slug === change.routeSlug));
    const index = items.findIndex((item) => item?.type === change.type && (String(item.id) === String(change.id) || item.slug === change.routeSlug));
    // A missing source item can mean deletion, a renamed slug, or an incomplete
    // provider response. Do not publish a partial snapshot in those cases.
    if (!update || index < 0) return null;
    items[index] = update;
  }
  return items;
}
