import assert from "node:assert/strict";
import test from "node:test";
import { resolveWooCommerceCredentials, resolveWordPressAuth } from "../framework/src/auth/sourceCredentials.js";

test("resolveWordPressAuth supports application passwords from env", () => {
  const auth = resolveWordPressAuth({
    auth: {
      type: "applicationPassword",
      usernameEnv: "WP_USER",
      passwordEnv: "WP_APP_PASSWORD"
    }
  }, {
    WP_APP_PASSWORD: "app password",
    WP_USER: "editor"
  });

  assert.equal(auth.type, "applicationPassword");
  assert.equal(auth.headers.authorization, `Basic ${Buffer.from("editor:app password").toString("base64")}`);
});

test("resolveWordPressAuth supports bearer token from env", () => {
  const auth = resolveWordPressAuth({
    auth: {
      type: "bearer",
      tokenEnv: "WP_TOKEN"
    }
  }, {
    WP_TOKEN: "secret-token"
  });

  assert.deepEqual(auth, {
    headers: {
      authorization: "Bearer secret-token"
    },
    type: "bearer"
  });
});

test("resolveWooCommerceCredentials reads consumer credentials from env", () => {
  const credentials = resolveWooCommerceCredentials({
    consumerKeyEnv: "WOO_KEY",
    consumerSecretEnv: "WOO_SECRET"
  }, {
    WOO_KEY: "ck_env",
    WOO_SECRET: "cs_env"
  });

  assert.deepEqual(credentials, {
    consumerKey: "ck_env",
    consumerSecret: "cs_env"
  });
});
