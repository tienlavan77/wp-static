import assert from "node:assert/strict";
import test from "node:test";
import createNavigationService, {
  NAVIGATION_CONTRACT_SCHEMA,
  NAVIGATION_CONTRACT_VERSION
} from "../framework/src/navigation/createNavigationService.js";
import createWordPressRepository from "../framework/src/adapters/wordpress/wordpressRepository.js";
import renderPage from "../framework/src/builder/renderer/renderPage.js";

test("Navigation Service normalizes a WordPress menu into a deterministic hierarchy", () => {
  const navigation = createNavigationService({ siteUrl: "https://site.example.test" });
  const menu = navigation.normalizeMenu({ id: 4, name: "Primary", slug: "primary" }, [
    { id: 30, menu_item_parent: 20, menu_order: 2, title: "Child second", url: "https://site.example.test/child-second/" },
    { id: 10, menu_item_parent: 0, menu_order: 2, title: "Second", url: "/second/" },
    { id: 20, menu_item_parent: 0, menu_order: 1, title: "First", url: "https://site.example.test/first/" },
    { id: 25, menu_item_parent: 20, menu_order: 1, title: "Child first", url: "/child-first/" }
  ]);

  assert.equal(menu.schema, NAVIGATION_CONTRACT_SCHEMA);
  assert.equal(menu.schemaVersion, NAVIGATION_CONTRACT_VERSION);
  assert.deepEqual(menu.items.map((item) => item.label), ["First", "Second"]);
  assert.deepEqual(menu.items[0].children.map((item) => item.label), ["Child first", "Child second"]);
  assert.equal(menu.items[0].url, "/first/");
  assert.equal(Object.isFrozen(menu), true);
});

test("WordPress repository resolves menu items before returning normalized navigation", async () => {
  const client = {
    async getCollection(pathname, query) {
      if (pathname.endsWith("menus")) return [{ id: 4, name: "Primary", slug: "primary" }];
      assert.equal(query.menus, 4);
      return [{ id: 2, menu_item_parent: 0, menu_order: 1, title: "About", url: "https://site.example.test/about/" }];
    }
  };
  const repository = createWordPressRepository(client, { siteUrl: "https://site.example.test" });
  const menus = await repository.getMenus();

  assert.equal(menus[0].slug, "primary");
  assert.equal(menus[0].items[0].url, "/about/");
});

test("Page rendering exposes normalized navigation to a theme layout", () => {
  const page = renderPage({ content: { title: "Welcome" }, path: "/" }, ({ html, navigation }) => html`<nav>${navigation[0].items[0].label}</nav>`, {
    graph: {
      menus: {
        items: [{ items: [{ label: "Home" }] }]
      }
    }
  });

  assert.match(page, /<nav>Home<\/nav>/);
});
