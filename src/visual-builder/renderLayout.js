import coreCommerceBlocks from "../blocks/core/commerceBlocks.js";
import createBlockRegistry from "../blocks/createBlockRegistry.js";
import html from "../renderer/html.js";
import createLayoutDocument from "./createLayoutDocument.js";
import createVisualBuilderContext from "./createVisualBuilderContext.js";
import renderLayoutNode from "./renderLayoutNode.js";

export default function renderLayout(rawLayout, options = {}) {
  const layout = createLayoutDocument(rawLayout);
  const registry = options.registry ?? createBlockRegistry([
    ...coreCommerceBlocks,
    ...(options.blocks ?? [])
  ]);
  const context = createVisualBuilderContext({
    ...options,
    html: options.html ?? html
  });
  const renderedSections = layout.sections.map((section) => renderLayoutNode(section, context, {
    registry,
    showFallbacks: options.showFallbacks ?? false
  }));

  return {
    errors: renderedSections.flatMap((section) => section.errors),
    html: renderedSections.map((section) => section.html).join(""),
    layout
  };
}
