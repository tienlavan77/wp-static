import createContent from "../../core/createContent.js";
import createWooCommerceClient from "./woocommerceClient.js";
import createWooCommerceRepository from "./woocommerceRepository.js";

export default function createWooCommerceAdapter(options = {}) {
  const client = createWooCommerceClient(options);
  const repository = createWooCommerceRepository(client, options);

  return {
    async getContents() {
      const contentInputs = await repository.getContents();

      return contentInputs.map(createContent);
    },
    async getCollections() {
      return {
        categories: await repository.getCategories(),
        tags: await repository.getTags()
      };
    }
  };
}
