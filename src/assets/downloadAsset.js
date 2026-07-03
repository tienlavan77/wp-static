import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export default async function downloadAsset(url, options) {
  const filename = options.filename;
  const cacheDir = options.cacheDir;
  const outputDir = options.outputDir;
  const cachePath = path.join(cacheDir, filename);
  const outputPath = path.join(outputDir, filename);

  await mkdir(cacheDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });

  if (await exists(cachePath)) {
    await copyFile(cachePath, outputPath);

    return {
      cached: true,
      bytes: (await stat(outputPath)).size
    };
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Unable to download asset ${url}: HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(cachePath, buffer);
  await writeFile(outputPath, buffer);

  return {
    cached: false,
    bytes: buffer.byteLength
  };
}

async function exists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}
