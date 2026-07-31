import { ConfigError } from "../../../shared/errors.js";

export default function assertBuilderEditorAccess(config = {}, options = {}) {
  const editor = config.builder?.editor ?? {};
  const tokenEnv = editor.tokenEnv;

  if (typeof tokenEnv !== "string" || tokenEnv.trim() === "") {
    throw new ConfigError('Config field "builder.editor.tokenEnv" is required for builder editor access.');
  }

  const expectedToken = options.env?.[tokenEnv] ?? process.env[tokenEnv];

  if (typeof expectedToken !== "string" || expectedToken.trim() === "") {
    throw new ConfigError(`Builder editor token env "${tokenEnv}" is required.`);
  }

  if (options.editorToken !== expectedToken) {
    throw new ConfigError("Builder editor token is invalid.");
  }

  return true;
}
