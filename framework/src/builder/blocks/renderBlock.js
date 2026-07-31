import resolveBlockBindings from "./resolveBlockBindings.js";
import validateBlockProps from "./validateBlockProps.js";

export default function renderBlock(block, input = {}, context = {}) {
  const validation = validateBlockProps(block, input.props ?? {});

  if (!validation.ok) {
    return {
      errors: validation.errors,
      html: ""
    };
  }

  if (typeof block.render !== "function") {
    return {
      errors: [],
      html: ""
    };
  }

  const bindings = resolveBlockBindings(block, context);

  const renderedHtml = block.render({
    bindings,
    context,
    html: context.html,
    props: validation.props
  });

  return {
    errors: [],
    html: normalizeRenderedHtml(renderedHtml)
  };
}

function normalizeRenderedHtml(value) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value.value === "string") {
    return value.value;
  }

  return "";
}
