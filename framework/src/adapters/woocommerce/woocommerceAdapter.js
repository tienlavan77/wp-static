import createContent from "../../core/createContent.js";
import createWooCommerceClient from "./woocommerceClient.js";
import createWooCommerceRepository from "./woocommerceRepository.js";
import createCommerceProviderContract from "../../commerce/createCommerceProviderContract.js";

export default function createWooCommerceAdapter(options = {}) {
  const client = createWooCommerceClient(options);
  const repository = createWooCommerceRepository(client, options);

  return {
    async getContents() {
      const contentInputs = await repository.getContents();

      return contentInputs.map(createContent);
    },
    async getContentsByChanges(changes) {
      if (typeof repository.getContentsByChanges !== "function") return null;
      const contentInputs = await repository.getContentsByChanges(changes);
      return Array.isArray(contentInputs) ? contentInputs.map(createContent) : null;
    },
    async getCollections() {
      return {
        attributes: await repository.getAttributes(),
        categories: await repository.getCategories(),
        store: await repository.getStoreConfiguration(),
        tags: await repository.getTags()
      };
    },
    async getCommerceContract(input = {}) {
      const [products, collections] = await Promise.all([
        this.getContents(),
        this.getCollections()
      ]);
      return createCommerceProviderContract({
        ...collections,
        products,
        siteId: input.siteId ?? options.siteId
      });
    }
  };
}
