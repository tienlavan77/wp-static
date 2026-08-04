#!/usr/bin/env node

import { createHash } from "node:crypto";
import { lstat, readFile, readdir, readlink } from "node:fs/promises";
import path from "node:path";

const targetArg = process.argv.indexOf("--path");
if (targetArg < 0 || !process.argv[targetArg + 1] || !path.isAbsolute(process.argv[targetArg + 1])) throw new Error("Usage: c048-database-fingerprint.js --path /absolute/database/path");
const target = path.resolve(process.argv[targetArg + 1]);
process.stdout.write(`${await fingerprint(target)}\n`);

async function fingerprint(file) {
  const hash = createHash("sha256");
  hash.update("wpsc.c048.database-fingerprint.v1\0");
  hash.update(file);
  hash.update("\0");
  hash.update(await entry(file));
  return hash.digest("hex");
}
async function entry(file) {
  try {
    const metadata = await lstat(file);
    if (metadata.isSymbolicLink()) return `symlink:${await readlink(file)}`;
    if (metadata.isFile()) return `file:${metadata.size}:${createHash("sha256").update(await readFile(file)).digest("hex")}`;
    if (metadata.isDirectory()) { const children = []; for (const name of (await readdir(file)).sort()) children.push([name, await entry(path.join(file, name))]); return `directory:${createHash("sha256").update(JSON.stringify(children)).digest("hex")}`; }
    return `special:${metadata.mode}`;
  } catch (error) { if (error.code === "ENOENT") return "absent"; throw error; }
}
