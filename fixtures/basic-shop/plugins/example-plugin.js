import { writeFile } from "node:fs/promises";

export default function examplePlugin(options = {}) {
  return {
    name: "example-plugin",

    data(data) {
      return {
        ...data,
        contents: [
          ...data.contents,
          {
            id: "page-plugin-demo",
            type: "page",
            title: "Plugin demo",
            slug: "plugin-demo",
            domain: "plugin",
            data: {
              description: "Trang được thêm bởi plugin example."
            }
          }
        ]
      };
    },

    render(page) {
      return {
        ...page,
        html: page.html.replace("</body>", "<!-- rendered-by-example-plugin -->\n  </body>")
      };
    },

    async buildEnd() {
      if (options.markerPath) {
        await writeFile(options.markerPath, "example-plugin buildEnd\n", "utf8");
      }
    }
  };
}
