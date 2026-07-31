import {
  checkNodeVersion,
  checkWritableDirectory
} from "../validation/checkEnvironment.js";
import { summarizeValidationResults } from "../validation/createValidationResult.js";

export const PROVISIONING_ENVIRONMENT_VERSION = "1.0";

export const ProvisioningEnvironmentSeverity = Object.freeze({
  ERROR: "error",
  INFO: "info",
  WARNING: "warning"
});

function toSeverity(status) {
  if (status === "error") {
    return ProvisioningEnvironmentSeverity.ERROR;
  }

  if (status === "warning") {
    return ProvisioningEnvironmentSeverity.WARNING;
  }

  return ProvisioningEnvironmentSeverity.INFO;
}

function createResultCode(result) {
  return `provision.environment.${result.category}.${result.name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function toDiagnostic(result) {
  return {
    category: result.category,
    code: createResultCode(result),
    detail: result.detail,
    fix: result.fix,
    message: result.summary,
    name: result.name,
    severity: toSeverity(result.status),
    status: result.status
  };
}

/**
 * validateProvisioningEnvironment
 *
 * Environment Check dùng riêng cho Provisioning Service (Sprint 6 -
 * Phase 2). Đây KHÔNG phải một bộ check mới - nó tái sử dụng các
 * primitive đã có sẵn từ `src/validation/checkEnvironment.js` (được
 * dùng chung với `validateInstallationEnvironment.js` ở Sprint 4/5),
 * đúng với Principle 1 (Shared Infrastructure): Framework chỉ có MỘT
 * bộ Environment Check, không tạo bản sao riêng cho từng nơi dùng.
 *
 * Khác với `validateInstallationEnvironment` (kiểm tra môi trường để
 * cài đặt Release), hàm này chỉ kiểm tra điều kiện tối thiểu để
 * Provisioning Service có thể tạo Site mới một cách an toàn:
 *   - Node.js runtime đủ version.
 *   - Thư mục `sites/` (workspace root) có thể ghi được.
 *
 * Không kiểm tra PHP/SSL/Runtime config vì đó thuộc phạm vi Installer
 * (Sprint 4/5), không thuộc phạm vi khởi tạo Site (Sprint 6).
 *
 * @param {object} options
 * @param {string} options.sitesDir Thư mục `sites/` của Workspace (bắt buộc).
 * @param {object} [options.node] Override cho checkNodeVersion (vd: minimumMajor).
 * @param {object} [options.checks] Override toàn bộ check function, dùng cho test.
 * @returns {Promise<{ok: boolean, diagnostics: object, results: object[], summary: object, version: string}>}
 */
export default async function validateProvisioningEnvironment(options = {}) {
  const checks = options.checks || {};
  const sitesDir = options.sitesDir;

  if (!sitesDir) {
    throw new TypeError("validateProvisioningEnvironment requires options.sitesDir");
  }

  const results = [];

  results.push(await (checks.node || checkNodeVersion)(options.node || {}));
  results.push(
    await (checks.sitesDir || checkWritableDirectory)(
      sitesDir,
      "Workspace sites directory",
      {
        category: "filesystem",
        fix: "Create the workspace sites directory or grant write permission before provisioning continues."
      }
    )
  );

  const summary = summarizeValidationResults(results);

  return {
    diagnostics: {
      errors: results.filter((result) => result.status === "error").map(toDiagnostic),
      warnings: results.filter((result) => result.status === "warning").map(toDiagnostic)
    },
    ok: summary.error === 0,
    results: results.map(toDiagnostic),
    summary,
    version: PROVISIONING_ENVIRONMENT_VERSION
  };
}
