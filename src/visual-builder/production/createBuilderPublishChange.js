export default function createBuilderPublishChange(layoutId) {
  return {
    id: layoutId,
    reason: `builder:publish:${layoutId}`,
    routeSlug: null,
    source: "builder",
    taxonomy: null,
    type: "layout"
  };
}
