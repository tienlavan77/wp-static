#!/usr/bin/env node

import path from "node:path";
import createProductionPackageBundle from "../framework/src/product/package/createProductionPackageBundle.js";

const packageDir = argument("--package-dir");
const outputFile = argument("--output");
const result = await createProductionPackageBundle().build({ packageDir: path.resolve(packageDir), outputFile: path.resolve(outputFile) });
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

function argument(name) { const index = process.argv.indexOf(name); const value = index >= 0 ? process.argv[index + 1] : null; if (!value) throw new Error(`Usage: build-c048-production-bundle.js --package-dir <signed-package-directory> --output <bundle.json>`); return value; }
