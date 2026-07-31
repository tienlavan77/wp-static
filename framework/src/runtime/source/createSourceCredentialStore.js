import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export default function createSourceCredentialStore(options = {}) {
  const repository = options.repository;
  if (!repository || typeof repository.resolveSiteRoot !== "function") throw new TypeError("Source Credential Store requires Site Repository.");
  const filePath = (siteId) => path.join(repository.resolveSiteRoot(siteId), "config", "source-credentials.json");
  return Object.freeze({
    async summary(siteId) { try { const value = await this.read(siteId); return { applicationPassword: Boolean(value.applicationPassword), woocommerceConsumerKey: Boolean(value.woocommerceConsumerKey), woocommerceConsumerSecret: Boolean(value.woocommerceConsumerSecret), wordpressUsername: value.wordpressUsername || "" }; } catch { return {}; } },
    async read(siteId) { return JSON.parse(await readFile(filePath(siteId), "utf8")); },
    async write(siteId, credentials) { const target = filePath(siteId); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, `${JSON.stringify(credentials)}\n`, { encoding: "utf8", mode: 0o600 }); await chmod(target, 0o600); return { path: target }; }
  });
}
