import addRelatedProducts from "./addRelatedProducts.js";
import createCommerceCollections from "./createCommerceCollections.js";

export default function applyAdvancedCommerceData(data = {}) {
  const baseContents = data.contents ?? [];
  const products = baseContents.filter((content) => content.type === "product");
  const contents = addRelatedProducts(baseContents);
  const commerceCollections = createCommerceCollections(contents.filter((content) => content.type === "product"));

  return {
    collections: {
      ...(data.collections ?? {}),
      commerce: commerceCollections
    },
    contents
  };
}
