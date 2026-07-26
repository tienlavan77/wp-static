import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import createTemplateManifest from "./createTemplateManifest.js";

export default async function writeTemplateManifest(options = {}) {
  try {
    const manifest = await createTemplateManifest(options);
    const outputDir = options.outputDir;
    const outputPath = path.join(outputDir, "data", "templates", "manifest.json");

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify({
      schemaVersion: 1,
      kind: "templateManifest",
      templatesDir: manifest.templatesDir,
      templates: manifest.templates
    }, null, 2)}\n`, "utf8");

    return {
      filesWritten: 1,
      manifestPath: outputPath,
      templates: manifest.templates
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return {
        filesWritten: 0,
        manifestPath: null,
        templates: []
      };
    }

    throw error;
  }
}
