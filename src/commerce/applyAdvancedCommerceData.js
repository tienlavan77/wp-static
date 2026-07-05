import addRelatedProducts from "./addRelatedProducts.js";
import createCommerceCollections from "./createCommerceCollections.js";
import createProductVariantContents from "./createProductVariantContents.js";

export default function applyAdvancedCommerceData(data = {}) {
  const baseContents = data.contents ?? [];
  const products = baseContents.filter((content) => content.type === "product");
  const variantContents = createProductVariantContents(products);
  const contentsWithVariants = [...baseContents, ...variantContents];
  const contents = addRelatedProducts(contentsWithVariants);
  const commerceCollections = createCommerceCollections(contents.filter((content) => content.type === "product"));

  return {
    collections: {
      ...(data.collections ?? {}),
      commerce: commerceCollections
    },
    contents
  };
}
