import assert from "node:assert/strict";
import test from "node:test";
import createBuildPipeline, {
  BUILD_PIPELINE_STAGE_ORDER,
  createStandardBuildPipelineStages
} from "../framework/src/builder/createBuildPipeline.js";

test("createStandardBuildPipelineStages uses the Sprint 2 stage order", () => {
  assert.deepEqual(BUILD_PIPELINE_STAGE_ORDER, [
    "validate",
    "compile",
    "optimize",
    "output"
  ]);

  const stages = createStandardBuildPipelineStages({
    compile: () => "compiled",
    optimize: () => "optimized",
    output: () => "output",
    validate: () => "validated"
  });

  assert.deepEqual(stages.map((stage) => stage.name), BUILD_PIPELINE_STAGE_ORDER);
  assert.deepEqual(stages.map((stage) => stage.label), [
    "Validate",
    "Compile",
    "Optimize",
    "Output"
  ]);
});

test("createBuildPipeline runs stages in order and stores outputs in context", async () => {
  const events = [];
  const order = [];
  const stages = createStandardBuildPipelineStages({
    validate(context) {
      order.push("validate");
      assert.equal(context.projectDir, "/tmp/site");
      return { ok: true };
    },
    compile(context) {
      order.push("compile");
      assert.equal(context.validate.ok, true);
      return { pages: 3 };
    },
    optimize(context) {
      order.push("optimize");
      assert.equal(context.compile.pages, 3);
      return { assets: 2 };
    },
    output(context) {
      order.push("output");
      assert.equal(context.optimize.assets, 2);
      return { outputDir: "dist" };
    }
  });

  const result = await createBuildPipeline(stages, {
    context: {
      projectDir: "/tmp/site"
    },
    onProgress(event) {
      events.push(event);
    }
  });

  assert.deepEqual(order, BUILD_PIPELINE_STAGE_ORDER);
  assert.equal(result.pipeline.ok, true);
  assert.equal(result.pipeline.stages.length, 4);
  assert.equal(result.context.output.outputDir, "dist");
  assert.equal(events[0].step, "pipeline:validate:start");
  assert.equal(events.at(-1).step, "pipeline:output:finish");
});

test("createBuildPipeline annotates failing stage errors", async () => {
  const stages = createStandardBuildPipelineStages({
    validate: () => ({ ok: true }),
    compile: () => {
      throw new Error("compile failed");
    },
    optimize: () => ({ ok: true }),
    output: () => ({ ok: true })
  });

  await assert.rejects(
    () => createBuildPipeline(stages),
    (error) => {
      assert.equal(error.message, "compile failed");
      assert.equal(error.pipelineStage, "compile");
      assert.equal(error.pipelineStageLabel, "Compile");
      assert.equal(error.pipeline.ok, false);
      assert.deepEqual(error.pipeline.stages.map((stage) => stage.name), [
        "validate",
        "compile"
      ]);
      return true;
    }
  );
});
