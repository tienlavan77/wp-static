import { ConfigError } from "../shared/errors.js";

export function resolveWordPressAuth(options = {}, env = process.env) {
  const auth = options.auth ?? {};
  const type = auth.type ?? options.authType ?? "none";

  if (type === "none" || type === false) {
    return null;
  }

  if (type === "applicationPassword") {
    const username = readSecret(auth.username, auth.usernameEnv, env, "WordPress auth username");
    const password = readSecret(auth.password, auth.passwordEnv, env, "WordPress auth password");
    const token = Buffer.from(`${username}:${password}`).toString("base64");

    return {
      headers: {
        authorization: `Basic ${token}`
      },
      type
    };
  }

  if (type === "bearer") {
    const token = readSecret(auth.token, auth.tokenEnv, env, "WordPress bearer token");

    return {
      headers: {
        authorization: `Bearer ${token}`
      },
      type
    };
  }

  throw new ConfigError(`Unsupported WordPress auth type "${type}".`);
}

export function resolveWooCommerceCredentials(options = {}, env = process.env) {
  return {
    consumerKey: readOptionalSecret(options.consumerKey, options.consumerKeyEnv, env),
    consumerSecret: readOptionalSecret(options.consumerSecret, options.consumerSecretEnv, env)
  };
}

function readSecret(value, envName, env, label) {
  const resolved = readOptionalSecret(value, envName, env);

  if (!resolved) {
    throw new ConfigError(`${label} is required.`);
  }

  return resolved;
}

function readOptionalSecret(value, envName, env) {
  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }

  if (typeof envName === "string" && envName.trim() !== "") {
    return env[envName] ?? "";
  }

  return "";
}
