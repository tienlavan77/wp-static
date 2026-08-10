#!/usr/bin/env node

import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import createProductionPackageBuilder from "../framework/src/product/package/createProductionPackageBuilder.js";
import createProductionPackageBundle from "../framework/src/product/package/createProductionPackageBundle.js";
import createProductionPackageVerifier from "../framework/src/product/package/createProductionPackageVerifier.js";

const requiredC050Files = Object.freeze([
  "framework/src/cli/createProductReleaseOperationsCommand.js",
  "framework/src/cli/createProductRolloutCommand.js",
  "framework/src/cli/index.js",
  "framework/src/product/createProductRolloutFacade.js",
  "framework/src/product/createReadOnlyReleaseOperationsFacade.js",
  "framework/src/product/createReleaseArtifactPublisher.js",
  "framework/src/product/createReleaseOperationsConfiguration.js",
  "framework/src/product/installer/createReleaseUpdateEvidenceStore.js"
]);

const input = parse(process.argv.slice(2));
const sourceDir = path.resolve(input.source);
const outputDir = path.resolve(input.output);
const packageDir = path.join(outputDir, `wpsc-production-${input.version}`);
const bundleFile = path.join(outputDir, `wpsc-${input.version}.bundle.json`);
const evidence = augmentEvidence(JSON.parse(await readFile(path.resolve(input.evidence), "utf8")));
const privateKey = createPrivateKey(await readFile(path.resolve(input.privateKey), "utf8"));
const publicKeyPem = await readFile(path.resolve(input.publicKey), "utf8");
const publicKey = createPublicKey(publicKeyPem);

await stat(outputDir).then(() => { throw new Error("C050-R1 output directory already exists and is immutable."); }, (error) => { if (error.code !== "ENOENT") throw error; });
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "production-dependencies.json"), `${JSON.stringify(evidence, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
const built = await createProductionPackageBuilder({ sign: async (bytes) => sign(null, bytes, privateKey).toString("base64") }).build({ evidence, sourceDir, targetDir: packageDir, version: input.version });
if (!verify(null, built.signingInput, publicKey, Buffer.from(built.manifest.signature, "base64"))) throw new Error("C050-R1 signature does not match the reviewed public key.");
const verifier = createProductionPackageVerifier({ architectureVersion: "2.02", nodeVersion: input.nodeVersion, productId: "wpsc", runtimeVersion: "1.0" });
const verified = await verifier.verifyPackage({ packageDir, publicKey: publicKeyPem });
if (!verified.accepted) throw new Error(`C041 rejected C050-R1: ${verified.diagnostics.errors[0]?.code ?? "unknown"}`);
const bundle = await createProductionPackageBundle().build({ outputFile: bundleFile, packageDir });
const bytes = await readFile(bundleFile);
const metadata = Object.freeze({
  artifact: path.basename(bundleFile),
  minNodeMajor: Number(input.nodeVersion.replace(/^v/, "").split(".")[0]),
  productId: "wpsc",
  schema: "wpsc.release-authoring-metadata",
  schemaVersion: 1,
  sha256: sha256(bytes),
  size: bytes.length,
  version: input.version
});
await writeFile(path.join(outputDir, "release-metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
process.stdout.write(`${JSON.stringify({ bundle, c041Accepted: true, metadata, packageDir, publicKeyMatches: true, requiredC050Files }, null, 2)}\n`);

function augmentEvidence(value) {
  if (value?.schema !== "wpsc.production-dependencies" || value.schemaVersion !== 1 || !value.features?.production) throw new TypeError("C050-R1 requires reviewed C040 production dependency evidence.");
  const production = value.features.production;
  const assets = [...new Set([...(production.assets ?? []), ...requiredC050Files])].sort();
  return { ...value, features: { ...value.features, production: { ...production, assets } } };
}

function parse(args) {
  const result = {};
  for (let index = 0; index < args.length; index += 2) result[args[index].replace(/^--/, "")] = args[index + 1];
  for (const name of ["evidence", "node-version", "output", "private-key", "public-key", "source", "version"]) if (!result[name]) throw new Error(`Missing required argument: --${name}`);
  if (!/^\d+\.\d+\.\d+$/.test(result.version)) throw new TypeError("C050-R1 version must be semantic x.y.z.");
  return { evidence: result.evidence, nodeVersion: result["node-version"], output: result.output, privateKey: result["private-key"], publicKey: result["public-key"], source: result.source, version: result.version };
}

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
