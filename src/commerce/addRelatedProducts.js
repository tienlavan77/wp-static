export default function addRelatedProducts(contents = [], options = {}) {
  const limit = options.limit ?? 4;
  const products = contents.filter((content) => content.type === "product" && !content.data?.parentProductId);

  return contents.map((content) => {
    if (content.type !== "product") {
      return content;
    }

    return {
      ...content,
      data: {
        ...content.data,
        relatedProductIds: findRelatedProducts(content, products, limit).map((product) => product.id)
      }
    };
  });
}

function findRelatedProducts(product, products, limit) {
  const terms = new Set((product.data?.terms ?? []).map((term) => `${term.taxonomy}:${term.slug}`));

  return products
    .filter((candidate) => candidate.id !== product.id)
    .map((candidate) => ({
      candidate,
      score: scoreProduct(candidate, terms)
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.candidate.slug.localeCompare(right.candidate.slug))
    .slice(0, limit)
    .map((item) => item.candidate);
}

function scoreProduct(product, terms) {
  return (product.data?.terms ?? []).reduce((score, term) => {
    return terms.has(`${term.taxonomy}:${term.slug}`) ? score + 1 : score;
  }, 0);
}
