import assert from "node:assert/strict";
import test from "node:test";
import createSetupSessionManager, {
  SETUP_SESSION_VERSION,
  validateSetupSession
} from "../src/setup/createSetupSessionManager.js";
import createSetupSessionRepository from "../src/setup/createSetupSessionRepository.js";

const validContext = Object.freeze({ client: "browser", siteId: "company-a" });
const validateContext = (context) => ({
  errors: context?.siteId ? [] : [{ code: "setup.context.invalid" }],
  ok: Boolean(context?.siteId)
});

test("createSetupSessionManager stores immutable session snapshots in its repository", () => {
  const repository = createSetupSessionRepository();
  const manager = createSetupSessionManager({
    createId: () => "setup-session-1",
    now: () => "2026-07-27T00:00:00.000Z",
    repository,
    validateContext
  });
  const session = manager.create(validContext);

  assert.equal(manager.version, SETUP_SESSION_VERSION);
  assert.equal(Object.isFrozen(session), true);
  assert.equal(repository.read(session.id), session);
  assert.deepEqual(manager.list(), [session]);
  assert.equal(validateSetupSession(session, validateContext).ok, true);
});

test("createSetupSessionManager rejects duplicate identifiers and invalid contexts", () => {
  const duplicate = createSetupSessionManager({
    createId: () => "duplicate-session",
    now: () => "2026-07-27T00:00:00.000Z",
    validateContext
  });

  duplicate.create(validContext);
  assert.throws(() => duplicate.create(validContext), (error) => error.code === "setup.session.duplicate");

  const invalid = createSetupSessionManager({
    createId: () => "invalid-session",
    now: () => "2026-07-27T00:00:00.000Z",
    validateContext
  });
  assert.throws(() => invalid.create({}), (error) => {
    assert.equal(error.code, "setup.session.invalid");
    assert.deepEqual(error.diagnostics.map((item) => item.code), ["setup.context.invalid"]);
    return true;
  });
});
