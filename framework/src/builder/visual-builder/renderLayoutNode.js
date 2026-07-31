import renderBlock from "../blocks/renderBlock.js";
import escapeHtml from "../../shared/escapeHtml.js";

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
    html: wrapRenderedNode(node, rendered.html || renderFallback(options, node, ""), "wpsc-block")
  };
}

function renderSectionNode(node, context, options) {
  const renderedChildren = (node.children ?? []).map((child) => renderLayoutNode(child, context, options));
  const childrenHtml = renderedChildren.map((child) => child.html).join("");
  const errors = renderedChildren.flatMap((child) => child.errors);
  const kind = node.settings?.kind;
  const className = [
    kind === "row" ? "wpsc-row" : kind === "column" ? "wpsc-column" : "wpsc-section",
    node.settings?.width ? `wpsc-section--${safeClassName(node.settings.width)}` : "",
    node.settings?.className ?? ""
  ].filter(Boolean).join(" ");
  const style = kind === "row"
    ? createStyleAttribute({
      ...createCommonStyleValues(node.settings),
      "--wpsc-row-columns": String((node.children ?? []).length || node.settings?.columns || 2),
      "--wpsc-row-content-max-width": node.settings?.contentMaxWidth ?? null,
      "--wpsc-row-content-width": node.settings?.contentWidth ?? null,
      "--wpsc-row-gap": node.settings?.gap ?? null
    })
    : createStyleAttribute(createCommonStyleValues(node.settings));

  return {
    errors,
    html: kind === "row"
      ? `<section class="${className}"${style} data-layout-node="${escapeAttribute(node.id)}"><div class="wpsc-row__inner">${childrenHtml}</div></section>`
      : `<section class="${className}"${style} data-layout-node="${escapeAttribute(node.id)}">${childrenHtml}</section>`
  };
}

function wrapRenderedNode(node, html, baseClassName) {
  if (!html) {
    return "";
  }

  const className = [
    baseClassName,
    node.settings?.className ?? ""
  ].filter(Boolean).join(" ");
  const style = createStyleAttribute(createCommonStyleValues(node.settings));

  return `<div class="${escapeAttribute(className)}"${style} data-layout-node="${escapeAttribute(node.id)}">${html}</div>`;
}

function createCommonStyleValues(settings = {}) {
  return {
    "background": settings.background ?? null,
    "color": settings.color ?? null,
    "height": settings.height ?? null,
    "margin": settings.margin ?? null,
    "max-width": settings.maxWidth ?? null,
    "padding": settings.padding ?? null,
    "width": settings.width ?? null
  };
}

function createStyleAttribute(values) {
  const style = Object.entries(values)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${key}: ${escapeAttribute(value)}`)
    .join("; ");

  return style ? ` style="${style}"` : "";
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
