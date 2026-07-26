import { escapeText } from "../shared/html.js";

export function renderMainHeader(html, options = {}) {
  return html.raw(`
    <header class="storefront-main-header">
      <div class="storefront-container storefront-main-header__inner">
        <a class="storefront-logo" href="/">
          <span>TSP</span>
          <h1><span>${escapeText(options.siteTitle ?? "TinSinhPhat")}</span></h1>
        </a>
        <form class="storefront-search" action="/search" data-storefront-search-form>
          <input type="search" name="s" placeholder="Tìm sản phẩm in ấn..." aria-label="Tìm kiếm">
          <button type="submit">Tìm</button>
        </form>
        <div class="storefront-actions">
          <a href="/account" data-account-link>Tài khoản</a>
          <a class="storefront-cart-link" href="/cart">Giỏ hàng <span data-cart-count>0</span></a>
        </div>
      </div>
    </header>
  `);
}
