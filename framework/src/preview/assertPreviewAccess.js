import { ConfigError } from "../shared/errors.js";

export default function assertPreviewAccess(config, options = {}) {
  if (options.preview !== true) {
    return;
  }

  const tokenEnv = config.preview?.tokenEnv;

  if (typeof tokenEnv !== "string" || tokenEnv.trim() === "") {
    throw new ConfigError('Config field "preview.tokenEnv" is required for preview builds.');
  }

  const expectedToken = options.env?.[tokenEnv] ?? process.env[tokenEnv];

  if (typeof expectedToken !== "string" || expectedToken.trim() === "") {
    throw new ConfigError(`Preview token env "${tokenEnv}" is required.`);
  }

  if (options.previewToken !== expectedToken) {
    throw new ConfigError("Preview token is invalid.");
  }
}
