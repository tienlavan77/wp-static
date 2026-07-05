import renderBlock from "../blocks/renderBlock.js";
import escapeHtml from "../shared/escapeHtml.js";

export default function renderLayoutNode(node, context, options = {}) {
  if (!node) {
    return {
      errors: [],
      html: ""
    };
  }

  if (node.type === "block") {
    return renderBlockNode(node, context, options);
  }

  return renderSectionNode(node, context, options);
}

function renderBlockNode(node, context, options) {
  const block = options.registry?.get(node.blockName);

  if (!block) {
    return {
      errors: [{
        message: `Missing block "${node.blockName}"`,
        nodeId: node.id
      }],
      html: renderFallback(options, node, `Missing block: ${node.blockName}`)
    };
  }

  const rendered = renderBlock(block, {
    props: {
      ...(node.props ?? {}),
      ...resolveLayoutBindings(node.bindings, context)
    }
  }, context);

  return {
    errors: rendered.errors.map((error) => ({
      ...error,
      nodeId: node.id
    })),
    html: rendered.html || renderFallback(options, node, "")
  };
}

function renderSectionNode(node, context, options) {
  const renderedChildren = (node.children ?? []).map((child) => renderLayoutNode(child, context, options));
  const childrenHtml = renderedChildren.map((child) => child.html).join("");
  const errors = renderedChildren.flatMap((child) => child.errors);
  const className = [
    "wpsc-section",
    node.settings?.width ? `wpsc-section--${safeClassName(node.settings.width)}` : ""
  ].filter(Boolean).join(" ");

  return {
    errors,
    html: `<section class="${className}" data-layout-node="${escapeAttribute(node.id)}">${childrenHtml}</section>`
  };
}

function resolveLayoutBindings(bindings = {}, context = {}) {
  const values = {};

  for (const [propName, binding] of Object.entries(bindings)) {
    const source = context[binding.source] ?? context.content;
    const value = getPath(source, binding.path);

    if (value !== undefined) {
      values[propName] = value;
    } else if (binding.fallback !== undefined) {
      values[propName] = binding.fallback;
    }
  }

  return values;
}

function getPath(source, path) {
  if (!source || !path) {
    return undefined;
  }

  return path.split(".").reduce((current, part) => {
    if (current === null || current === undefined) {
      return undefined;
    }

    return current[part];
  }, source);
}

function renderFallback(options, node, message) {
  if (!options.showFallbacks || !message) {
    return "";
  }

  return `<div class="wpsc-builder-fallback" data-layout-node="${escapeAttribute(node.id)}">${escapeHtml(message)}</div>`;
}

function safeClassName(value) {
  return String(value ?? "").toLowerCase().replaceAll(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}
