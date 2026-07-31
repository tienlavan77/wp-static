export default function createFreshBuildOptions(overrides = {}) {
  return {
    disableRouteRenderCache: true,
    freshContent: true,
    ...overrides
  };
}
