import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import createSiteRoutePolicy from "./createSiteRoutePolicy.js";

export default async function writeRouteManifest(sitePlan, options = {}) {
  const policy = sitePlan.routing ?? createSiteRoutePolicy({ site: options.site, siteId: options.siteId });
  const manifest = policy.createManifest(sitePlan.routes ?? []);
  const manifestPath = path.join(options.outputDir, ".wpsc", "routes.json");
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { manifest, manifestPath };
}
