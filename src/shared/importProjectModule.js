import { copyFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export default async function importProjectModule(absolutePath, options = {}) {
  const cacheSuffix = options.cacheBust ? `?t=${options.cacheBust}` : `?t=${Date.now()}`;
  const moduleUrl = `${pathToFileURL(absolutePath).href}${cacheSuffix}`;

  try {
    return await import(moduleUrl);
  } catch (error) {
    if (!shouldRetryAsEsm(error, absolutePath)) {
      throw error;
    }

    return importViaTemporaryMjs(absolutePath, cacheSuffix);
  }
}

async function importViaTemporaryMjs(absolutePath, cacheSuffix) {
  const temporaryPath = createTemporaryModulePath(absolutePath);

  await copyFile(absolutePath, temporaryPath);

  try {
    return await import(`${pathToFileURL(temporaryPath).href}${cacheSuffix}`);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

function createTemporaryModulePath(absolutePath) {
  const parsed = path.parse(absolutePath);
  const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return path.join(parsed.dir, `.${parsed.name}.${suffix}.mjs`);
}

function shouldRetryAsEsm(error, absolutePath) {
  return (
    path.extname(absolutePath) === ".js" &&
    error instanceof SyntaxError &&
    /Unexpected token 'export'|Cannot use import statement outside a module/.test(error.message)
  );
}
