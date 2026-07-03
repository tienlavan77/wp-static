import { AdapterError } from "../../shared/errors.js";

export default function createWordPressClient(options = {}) {
  if (typeof options.baseUrl !== "string" || options.baseUrl.trim() === "") {
    throw new AdapterError('WordPress adapter option "baseUrl" is required.');
  }

  const baseUrl = options.baseUrl.replace(/\/+$/, "");

  return {
    async getJson(pathname) {
      const response = await fetch(`${baseUrl}${pathname}`);

      if (!response.ok) {
        throw new AdapterError(`WordPress request failed: ${response.status} ${response.statusText}`);
      }

      return response.json();
    }
  };
}
