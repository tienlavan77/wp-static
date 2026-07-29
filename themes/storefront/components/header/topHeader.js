export function renderTopHeader(html) {
  return html.raw(`
    <div class="storefront-top-header">
      <div class="storefront-container storefront-top-header__inner">
        <div class="storefront-top-header__spacer" aria-hidden="true"></div>
        <nav class="storefront-top-nav" aria-label="Liên kết nhanh">
          <a href="/about-us">Chúng tôi</a>
          <a href="/blog">Blog</a>
          <a href="/rules">Điều khoản</a>
          <a href="/terms-condition">Bảo mật</a>
          <a href="/lien-he">Liên hệ</a>
          <a href="/newsletter">Newsletter</a>
          <span class="storefront-top-socials" aria-label="Mạng xã hội">
            <a href="/" aria-label="Facebook">f</a>
            <a href="/" aria-label="Instagram">ig</a>
            <a href="mailto:support@tinsinhphat.com" aria-label="Email">@</a>
          </span>
          <button class="storefront-theme-toggle" type="button" data-storefront-theme-toggle aria-label="Đổi giao diện sáng tối" aria-pressed="false">
            <span data-theme-icon aria-hidden="true">☾</span>
          </button>
        </nav>
      </div>
    </div>
  `);
}
