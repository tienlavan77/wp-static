import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import createRouteDataPayload, {
  createRouteDataFilename,
  createRouteDataPublicPath
} from "./createRouteDataPayload.js";

export default async function writeRouteDataOutputs(sitePlan, options = {}) {
  const outputDir = options.outputDir;
  const routesDir = path.join(outputDir, "data", "routes");
  const routes = sitePlan.routes ?? [];
  const routesToWrite = options.routesToWrite ?? routes;
  const routeByPath = new Map(routes.map((route) => [route.path, route]));
  const files = [];

  await mkdir(routesDir, { recursive: true });

  for (const route of routesToWrite) {
    const payload = createRouteDataPayload(route, {
      graph: sitePlan.graph,
      site: options.site
    });
    const filename = createRouteDataFilename(route);
    const relativePath = `data/routes/${filename}`;

    await writeFile(path.join(outputDir, relativePath), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    files.push({
      contentId: route.content.id,
      contentType: route.content.type,
      path: route.path,
      dataPath: createRouteDataPublicPath(route),
      outputPath: relativePath
    });
  }

  const manifest = {
    schemaVersion: 1,
    kind: "routeDataManifest",
    generatedAt: new Date().toISOString(),
    routes: routes.map((route) => ({
      contentId: route.content.id,
      contentType: route.content.type,
      path: route.path,
      dataPath: createRouteDataPublicPath(route),
      outputPath: `data/routes/${createRouteDataFilename(route)}`
    })),
    written: files
  };

  await writeFile(path.join(outputDir, "data", "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return {
    manifestPath: path.join(outputDir, "data", "manifest.json"),
    routesWritten: files.length,
    files,
    routes: manifest.routes,
    getRouteByPath(pathname) {
      return routeByPath.get(pathname) ?? null;
    }
  };
}
