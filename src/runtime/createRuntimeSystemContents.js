import deepFreeze from "../shared/deepFreeze.js";

// System pages are regular content so Builder V1 owns their routes and layouts.
const SYSTEM_PAGES = Object.freeze([
  { id: "runtime:account", slug: "account", title: "Tài khoản", type: "account" },
  {
    data: {
      description: "Đường dẫn này không còn tồn tại hoặc đã được thay đổi. Anh có thể tìm sản phẩm, xem danh mục hoặc quay lại trang chủ.",
      notFoundPage: true
    },
    id: "runtime:not-found",
    slug: "404",
    title: "Không tìm thấy trang anh cần",
    type: "page"
  },
  { id: "runtime:search", slug: "search", title: "Tìm kiếm", type: "search" }
]);

export default function createRuntimeSystemContents(contents = []) {
  const existingSlugs = new Set(contents.map((content) => content.slug));
  const systemContents = SYSTEM_PAGES
    .filter((page) => !existingSlugs.has(page.slug))
    .map((page) => deepFreeze({
      ...page,
      data: page.data || {},
      domain: "runtime",
      status: "published"
    }));

  return Object.freeze([...contents, ...systemContents]);
}
