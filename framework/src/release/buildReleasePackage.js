import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import createReleasePackageStructure from "./createReleasePackageStructure.js";

export const RELEASE_BUILDER_VERSION = "1.0";

async function pathExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch (error) {
    if (error.code === "EISDIR") {
      return true;
    }
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function copyIfExists(sourcePath, targetPath) {
  if (!(await pathExists(sourcePath))) {
    return null;
  }

  await mkdir(path.dirname(targetPath), {
    recursive: true
  });
  await cp(sourcePath, targetPath, {
    recursive: true
  });
  return targetPath;
}

async function writeFileFromStructure(outputDir, file) {
  const filePath = path.join(outputDir, file.path);
  await mkdir(path.dirname(filePath), {
    recursive: true
  });
  await writeFile(filePath, file.contents, "utf8");
  return filePath;
}

function createManifest({
  copied,
  generatedAt,
  outputDir,
  projectDir,
  structure
}) {
  return {
    copied,
    generatedAt,
    mode: structure.mode,
    outputDir,
    packageName: structure.packageName,
    publicRoot: structure.publicRoot,
    releaseBuilderVersion: RELEASE_BUILDER_VERSION,
    releaseStructureVersion: structure.version,
    sourceProjectDir: projectDir
  };
}

export default async function buildReleasePackage(options = {}) {
  const projectDir = path.resolve(options.projectDir || process.cwd());
  const outputDir = path.resolve(projectDir, options.outputDir || "release");
  const structure = createReleasePackageStructure({
    mode: options.mode,
    packageName: options.packageName || path.basename(outputDir)
  });
  const generatedAt = options.generatedAt || new Date().toISOString();

  if (options.clean === true) {
    await rm(outputDir, {
      force: true,
      recursive: true
    });
  }

  await mkdir(outputDir, {
    recursive: true
  });

  const directories = [];
  for (const directory of structure.directories) {
    const directoryPath = path.join(outputDir, directory);
    await mkdir(directoryPath, {
      recursive: true
    });
    directories.push(directoryPath);
  }

  const files = [];
  for (const file of structure.files) {
    files.push(await writeFileFromStructure(outputDir, file));
  }

  const copied = {
    public: await copyIfExists(path.join(projectDir, "public"), path.join(outputDir, "public")),
    themes: await copyIfExists(path.join(projectDir, "themes"), path.join(outputDir, "themes")),
    plugins: await copyIfExists(path.join(projectDir, "plugins"), path.join(outputDir, "plugins"))
  };

  const manifest = createManifest({
    copied,
    generatedAt,
    outputDir,
    projectDir,
    structure
  });
  const manifestPath = path.join(outputDir, "release-manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return {
    copied,
    directories,
    files: [...files, manifestPath],
    generatedAt,
    manifest,
    manifestPath,
    ok: true,
    outputDir,
    projectDir,
    structure,
    version: RELEASE_BUILDER_VERSION
  };
}
