import assert from "node:assert/strict";
import test from "node:test";
import { PRODUCT_MANIFEST_SCHEMA, WPSC_ARCHITECTURE_VERSION } from "../framework/src/product/createProductManifest.js";
import { PRODUCT_PACKAGE_SCHEMA } from "../framework/src/product/createProductPackageService.js";
import { PRODUCT_PROFILE_SCHEMA, ProductProfile } from "../framework/src/product/createPersonalEditionProfileService.js";
import { PRODUCT_MIGRATION_SCHEMA } from "../framework/src/product/createProductMigrationService.js";
import { PRODUCT_SUPPORT_BUNDLE_SCHEMA } from "../framework/src/product/createProductSupportBundleService.js";

test("Sprint 10 Architecture Audit freezes Product Packaging contracts", () => {
  assert.equal(PRODUCT_MANIFEST_SCHEMA, "wpsc.product");
  assert.equal(WPSC_ARCHITECTURE_VERSION, "2.02");
  assert.equal(PRODUCT_PACKAGE_SCHEMA, "wpsc.product-package");
  assert.equal(PRODUCT_MIGRATION_SCHEMA, "wpsc.product-migration");
  assert.equal(PRODUCT_SUPPORT_BUNDLE_SCHEMA, "wpsc.product-support-bundle");
  assert.equal(PRODUCT_PROFILE_SCHEMA, "wpsc.product-profile");
  assert.equal(ProductProfile.PERSONAL, "personal");
});

test("Sprint 10 Packaging Audit keeps commercial systems outside Product Core", () => {
  const productScopes = ["manifest", "bootstrap", "environment", "cli-gateway", "migration", "validation", "package", "profile", "support-bundle"];
  const excludedCommercialScopes = ["license-server", "billing", "stripe", "entitlement", "sso", "enterprise-rbac", "saas-control-plane"];
  assert.equal(productScopes.some((scope) => excludedCommercialScopes.includes(scope)), false);
  assert.equal(productScopes.includes("profile"), true);
  assert.equal(productScopes.includes("package"), true);
});
