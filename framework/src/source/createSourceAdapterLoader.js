import { assertSourceAdapter } from "./sourceAdapterContract.js";

export default function createSourceAdapterLoader(options = {}) {
  const registry = options.registry;

  if (!registry || typeof registry.resolve !== "function") {
    throw new TypeError("Source adapter loader requires a Source Registry.");
  }

  return {
    load(type, adapterOptions = {}) {
      const create = registry.resolve(type);
      return assertSourceAdapter(create(adapterOptions));
    }
  };
}
