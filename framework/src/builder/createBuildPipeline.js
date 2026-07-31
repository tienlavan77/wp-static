export const BUILD_PIPELINE_STAGE_ORDER = [
  "validate",
  "compile",
  "optimize",
  "output"
];

export default async function createBuildPipeline(stages = [], options = {}) {
  const normalizedStages = normalizeStages(stages);
  const context = {
    ...(options.context ?? {}),
    pipeline: {
      startedAt: Date.now(),
      stages: []
    }
  };

  for (const stage of normalizedStages) {
    const startedAt = Date.now();

    emitProgress(options.onProgress, stage, "start", {
      index: context.pipeline.stages.length
    });

    try {
      const value = await stage.run(context);
      const result = {
        durationMs: Date.now() - startedAt,
        label: stage.label,
        name: stage.name,
        ok: true,
        value
      };

      context[stage.name] = value;
      context.pipeline.stages.push(result);
      emitProgress(options.onProgress, stage, "finish", result);
    } catch (error) {
      const result = {
        durationMs: Date.now() - startedAt,
        error,
        label: stage.label,
        name: stage.name,
        ok: false
      };

      context.pipeline.stages.push(result);
      emitProgress(options.onProgress, stage, "error", {
        ...result,
        error: serializeError(error)
      });

      error.pipelineStage = stage.name;
      error.pipelineStageLabel = stage.label;
      error.pipeline = createPipelineSummary(context);
      throw error;
    }
  }

  context.pipeline.finishedAt = Date.now();
  context.pipeline.durationMs = context.pipeline.finishedAt - context.pipeline.startedAt;
  context.pipeline.ok = true;

  return {
    context,
    pipeline: createPipelineSummary(context)
  };
}

export function createStandardBuildPipelineStages(handlers = {}) {
  return BUILD_PIPELINE_STAGE_ORDER.map((name) => ({
    label: createStageLabel(name),
    name,
    run: handlers[name] ?? createMissingStageHandler(name)
  }));
}

function normalizeStages(stages) {
  if (!Array.isArray(stages) || stages.length === 0) {
    throw new Error("Build pipeline requires at least one stage.");
  }

  return stages.map((stage) => {
    if (!stage || typeof stage !== "object") {
      throw new Error("Build pipeline stage must be an object.");
    }

    if (typeof stage.name !== "string" || stage.name.trim() === "") {
      throw new Error("Build pipeline stage name is required.");
    }

    if (typeof stage.run !== "function") {
      throw new Error(`Build pipeline stage "${stage.name}" requires a run function.`);
    }

    return {
      label: stage.label ?? createStageLabel(stage.name),
      name: stage.name,
      run: stage.run
    };
  });
}

function createPipelineSummary(context) {
  return {
    durationMs: context.pipeline.durationMs ?? Date.now() - context.pipeline.startedAt,
    ok: context.pipeline.stages.every((stage) => stage.ok),
    stages: context.pipeline.stages.map((stage) => ({
      durationMs: stage.durationMs,
      label: stage.label,
      name: stage.name,
      ok: stage.ok
    }))
  };
}

function emitProgress(onProgress, stage, status, data = {}) {
  if (typeof onProgress !== "function") {
    return;
  }

  onProgress({
    data,
    message: `${stage.label} ${status}`,
    stage: stage.name,
    status,
    step: `pipeline:${stage.name}:${status}`
  });
}

function createStageLabel(name) {
  return name
    .split(/[-_:]/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function createMissingStageHandler(name) {
  return () => {
    throw new Error(`Build pipeline stage "${name}" has no handler.`);
  };
}

function serializeError(error) {
  return {
    message: error?.message ?? String(error),
    name: error?.name ?? "Error"
  };
}
