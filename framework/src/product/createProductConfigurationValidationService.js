import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { validateProductCompatibility, validateProductManifest } from "./createProductManifest.js";
import createEnvironmentConfigurationService from "./createEnvironmentConfigurationService.js";
import { validateSiteRegistry } from "../site/siteRegistryContract.js";

export const PRODUCT_CONFIGURATION_VALIDATION_SCHEMA = "wpsc.product-configuration-validation";
export const PRODUCT_CONFIGURATION_VALIDATION_VERSION = 1;

export default function createProductConfigurationValidationService(options = {}) {
  const workspaceDir = path.resolve(options.workspaceDir ?? process.cwd());
  const repository = options.repository;
  if (!repository?.readRegistry || !repository?.readMetadata) throw new TypeError("Product Configuration Validation requires a Site Repository.");
  const environmentConfiguration = options.environmentConfiguration ?? createEnvironmentConfigurationService();

  async function validate(input = {}) {
    const errors = [];
    const warnings = [];
    const configuration = input.configuration ?? await readJson(path.join(workspaceDir, "config", "wpsc.json"), errors, "product.configuration.read.failed");
    const registry = input.registry ?? await readRegistry(errors);
    await validatePaths(errors);
    if (configuration) {
      errors.push(...validateProductManifest(configuration.product ?? {}).errors);
      errors.push(...validateProductCompatibility(configuration.product ?? {}, { architectureVersion: input.architectureVersion ?? configuration.product?.architectureVersion, nodeVersion: input.nodeVersion ?? process.versions.node, runtimeVersion: input.runtimeVersion ?? configuration.product?.runtimeVersion, schemas: input.schemas ?? {} }).errors);
    }
    if (registry) {
      errors.push(...validateSiteRegistry(registry).errors);
      for (const record of registry.sites ?? []) await validateSite(record.siteId, errors, warnings);
    }
    if (input.environmentConfig) {
      errors.push(...environmentConfiguration.validate(input.environmentConfig).errors);
    } else {
      warnings.push(issue("product.configuration.environment.missing", "Environment configuration was not supplied for validation.", "warning"));
    }
    return Object.freeze({ diagnostics: { errors, warnings }, invalid: errors.length > 0, ok: errors.length === 0, schema: PRODUCT_CONFIGURATION_VALIDATION_SCHEMA, schemaVersion: PRODUCT_CONFIGURATION_VALIDATION_VERSION, valid: errors.length === 0 });
  }

  async function validateSite(siteId, errors, warnings) {
    try { await repository.readMetadata(siteId); } catch (error) { errors.push(issue("product.configuration.site.metadata.missing", `Site metadata is unavailable: ${siteId}.`)); }
    try { await repository.readSettings(siteId); } catch (error) { if (error.code === "ENOENT") warnings.push(issue("product.configuration.site.settings.missing", `Site settings are not initialized: ${siteId}.`, "warning")); else errors.push(issue("product.configuration.site.settings.invalid", `Site settings cannot be read: ${siteId}.`)); }
  }
  async function readRegistry(errors) { try { return await repository.readRegistry(); } catch (error) { errors.push(issue("product.configuration.registry.read.failed", "Site Registry cannot be read.")); return null; } }
  async function validatePaths(errors) { for (const relative of ["config", "storage", "sites"]) { try { await access(path.join(workspaceDir, relative)); } catch { errors.push(issue("product.configuration.path.missing", `Required installation path is missing: ${relative}.`, "error", relative)); } } }
  return Object.freeze({ validate });
}

async function readJson(filePath, errors, code) { try { return JSON.parse(await readFile(filePath, "utf8")); } catch { errors.push(issue(code, `Configuration cannot be read: ${filePath}.`)); return null; } }
function issue(code, message, severity = "error", field = null) { return { code, field, message, severity }; }
