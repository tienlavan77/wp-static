import { cp, stat } from "node:fs/promises";

export default async function copyPublicAssets(publicDir, outputDir) {
  if (!publicDir) {
    return false;
  }

  try {
    const publicStat = await stat(publicDir);

    if (!publicStat.isDirectory()) {
      return false;
    }
  } catch {
    return false;
  }

  await cp(publicDir, outputDir, {
    recursive: true,
    force: true
  });

  return true;
}
