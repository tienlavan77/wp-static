import createContent from "../../core/createContent.js";
import createWordPressClient from "./wordpressClient.js";
import createWordPressRepository from "./wordpressRepository.js";

export default function createWordPressAdapter(options = {}) {
  const client = createWordPressClient(options);
  const repository = createWordPressRepository(client);

  return {
    async getContents() {
      const contentInputs = await repository.getContents();

      return contentInputs.map(createContent);
    }
  };
}
