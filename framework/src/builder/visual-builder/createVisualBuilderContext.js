export default function createVisualBuilderContext(options = {}) {
  const content = normalizeContent(options.content ?? options.route?.content);
  const graph = options.graph ?? null;

  return {
    content,
    graph,
    html: options.html,
    route: options.route ?? null,
    site: options.site ?? {},
    theme: options.theme ?? {},
    taxonomy: options.taxonomy ?? findTaxonomyContext(content, graph),
    product: options.product ?? findProductContext(content, graph)
  };
}

function normalizeContent(content) {
  if (!content) {
    return {
      data: {}
    };
  }

  return {
    ...content,
    data: {
      ...(content.data ?? {}),
      content: content.content ?? content.data?.content,
      description: content.description ?? content.data?.description,
      title: content.title ?? content.data?.title
    }
  };
}

function findProductContext(content, graph) {
  if (content?.type === "product") {
    return content;
  }

  if (typeof graph?.products?.find === "function" && content?.id) {
    return graph.products.find(content.id) ?? null;
  }

  return null;
}

function findTaxonomyContext(content, graph) {
  if (content?.taxonomy || content?.term) {
    return content;
  }

  if (typeof graph?.terms?.find === "function" && content?.id) {
    return graph.terms.find(content.id) ?? null;
  }

  return null;
}
