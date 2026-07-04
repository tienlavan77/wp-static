export default function createRebuildQueue(options = {}) {
  const rebuild = options.rebuild ?? defaultRebuild;
  const logger = options.logger ?? noopLogger;
  let running = null;
  let queuedRequest = null;
  let lastResult = null;

  async function enqueue(request) {
    const normalizedRequest = normalizeRequest(request);

    if (running) {
      queuedRequest = mergeRequests(queuedRequest, normalizedRequest);
      return {
        queued: true,
        running: true,
        status: "queued"
      };
    }

    running = run(normalizedRequest);

    try {
      lastResult = await running;

      return {
        queued: false,
        result: lastResult,
        running: false,
        status: "built"
      };
    } finally {
      running = null;

      if (queuedRequest) {
        const nextRequest = queuedRequest;
        queuedRequest = null;
        void enqueue(nextRequest);
      }
    }
  }

  async function run(request) {
    logger.info?.(`Webhook rebuild started: ${request.reason}`);
    const result = await rebuild(request);
    logger.info?.("Webhook rebuild finished");

    return result;
  }

  return {
    enqueue,
    getState() {
      return {
        lastResult,
        queued: queuedRequest !== null,
        running: running !== null
      };
    }
  };
}

function normalizeRequest(request = {}) {
  return {
    changes: Array.isArray(request.changes) ? request.changes : [],
    payload: request.payload ?? null,
    reason: request.reason ?? "webhook"
  };
}

function mergeRequests(left, right) {
  if (!left) {
    return right;
  }

  return {
    changes: [...left.changes, ...right.changes],
    payload: right.payload,
    reason: `${left.reason}, ${right.reason}`
  };
}

async function defaultRebuild() {
  return {
    ok: true
  };
}

const noopLogger = {
  info() {}
};
