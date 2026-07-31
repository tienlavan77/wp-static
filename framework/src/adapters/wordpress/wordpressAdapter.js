import createContent from "../../core/createContent.js";
import createWordPressClient from "./wordpressClient.js";
import createWordPressRepository from "./wordpressRepository.js";
import { createWordPressContentContract } from "../../source/wordpressContentContract.js";

export default function createWordPressAdapter(options = {}) {
  const client = options.client ?? createWordPressClient(options);
  const repository = options.repository ?? createWordPressRepository(client, options);

  return {
    async getContents() {
      const contentInputs = await repository.getContents();

      return contentInputs.map(createContent);
    },
    async getCollections() {
      return {
        authors: await repository.getAuthors(),
        media: await repository.getMedia(),
        menus: await repository.getMenus(),
        terms: await repository.getTerms()
      };
    },
    async getContentContract() {
      const [contents, terms, authors] = await Promise.all([
        this.getContents(),
        repository.getTerms(),
        repository.getAuthors()
      ]);

      return createWordPressContentContract({ authors, contents, terms });
    }
  };
}
