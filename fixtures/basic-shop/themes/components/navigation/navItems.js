export function createNavItemsFromCategories(categories = []) {
  return [
    { href: "/", label: "Trang chủ" },
    { href: "/shop", label: "Sản phẩm" },
    ...categories.slice(0, 5).map((category) => ({
      href: category.href ?? category.path ?? `/${category.slug}`,
      label: category.label ?? category.name ?? category.title ?? category.slug
    }))
  ];
}

export function normalizeNavItems(items = []) {
  const normalized = Array.isArray(items) && items.length > 0
    ? items
    : [{ href: "/", label: "Trang chủ" }, { href: "/shop", label: "Sản phẩm" }, { href: "/lien-he", label: "Liên hệ" }];

  return normalized.filter((item) => item.href && item.label);
}
