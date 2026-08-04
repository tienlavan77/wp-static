import { mkdir, open, readFile, rename } from "node:fs/promises";
import path from "node:path";

export default function createAtomicJsonStore(file, options = {}) {
  const target = path.resolve(file);
  const writeFile = options.writeFile ?? writeAtomically;
  async function read() { return JSON.parse(await readFile(target, "utf8")); }
  async function write(value) { await writeFile(target, value); return value; }
  return Object.freeze({ path: target, read, write });
}

async function writeAtomically(target, value) {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  const handle = await open(temporary, "wx", 0o600);
  try { await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8"); await handle.sync(); }
  finally { await handle.close(); }
  await rename(temporary, target);
  const directory = await open(path.dirname(target), "r");
  try { await directory.sync(); } finally { await directory.close(); }
}
