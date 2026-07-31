import createBlockSchema from "./createBlockSchema.js";

export default function createBlockRegistry(blocks = [], options = {}) {
  const blockMap = new Map();

  for (const rawBlock of blocks) {
    const block = createBlockSchema(rawBlock);

    if (blockMap.has(block.name) && !options.allowOverride) {
      throw new Error(`Duplicate block "${block.name}".`);
    }

    blockMap.set(block.name, block);
  }

  return {
    all() {
      return [...blockMap.values()];
    },
    get(name) {
      return blockMap.get(name) ?? null;
    },
    has(name) {
      return blockMap.has(name);
    }
  };
}
