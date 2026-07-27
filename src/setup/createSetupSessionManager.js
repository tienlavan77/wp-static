import { randomUUID } from "node:crypto";
import deepFreeze from "../shared/deepFreeze.js";
import createSetupSessionRepository from "./createSetupSessionRepository.js";

export const SETUP_SESSION_VERSION = "1.0";

function assertSessionId(sessionId) {
  if (typeof sessionId !== "string" || sessionId.trim() === "") {
    throw new TypeError("Setup session id must be a non-empty string.");
  }

  return sessionId.trim();
}

export function validateSetupSession(session = {}, validateContext = () => ({ ok: true })) {
  const errors = [];

  if (typeof session.id !== "string" || session.id.trim() === "") {
    errors.push({
      code: "setup.session.id.required",
      message: "Setup session id is required.",
      severity: "error"
    });
  }

  const contextValidation = validateContext(session.context);
  errors.push(...(contextValidation.errors || []));

  if (typeof session.createdAt !== "string" || session.createdAt.trim() === "") {
    errors.push({
      code: "setup.session.created_at.required",
      message: "Setup session creation time is required.",
      severity: "error"
    });
  }

  return { errors, ok: errors.length === 0 };
}

export default function createSetupSessionManager(options = {}) {
  const repository = options.repository || createSetupSessionRepository();
  const createId = options.createId || (() => `setup-${randomUUID()}`);
  const now = options.now || (() => new Date().toISOString());
  const validateContext = options.validateContext || (() => ({ errors: [], ok: true }));

  function create(context) {
    const timestamp = now();
    const session = deepFreeze({
      context,
      createdAt: timestamp,
      endedAt: null,
      id: assertSessionId(createId()),
      updatedAt: timestamp,
      version: SETUP_SESSION_VERSION
    });
    const validation = validateSetupSession(session, validateContext);

    if (!validation.ok) {
      const error = new Error("Setup session contract is invalid.");
      error.code = "setup.session.invalid";
      error.diagnostics = validation.errors;
      throw error;
    }

    if (repository.has(session.id)) {
      const error = new Error(`Setup session "${session.id}" already exists.`);
      error.code = "setup.session.duplicate";
      throw error;
    }

    return repository.write(session);
  }

  function get(sessionId) {
    const id = assertSessionId(sessionId);
    const session = repository.read(id);

    if (!session) {
      const error = new Error(`Setup session "${id}" was not found.`);
      error.code = "setup.session.not_found";
      throw error;
    }

    return session;
  }

  function end(sessionId) {
    const current = get(sessionId);

    if (current.endedAt) {
      const error = new Error(`Setup session "${current.id}" has already ended.`);
      error.code = "setup.session.ended";
      throw error;
    }

    const timestamp = now();
    const session = deepFreeze({
      ...current,
      endedAt: timestamp,
      updatedAt: timestamp
    });
    return repository.write(session);
  }

  function list() {
    return repository.list();
  }

  return { create, end, get, list, version: SETUP_SESSION_VERSION };
}
