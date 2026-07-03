import { rm } from "node:fs/promises";

export default async function cleanOutput(outputDir) {
  await rm(outputDir, {
    recursive: true,
    force: true
  });
}
