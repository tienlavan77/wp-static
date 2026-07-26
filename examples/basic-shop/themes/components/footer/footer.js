import { escapeText } from "../shared/html.js";

export function renderFooter(html, options = {}) {
  return html.raw(`
    <footer class="storefront-footer">
      <div class="storefront-container storefront-footer__primary">
        <section class="storefront-footer__company">
          <a class="storefront-footer__logo" href="/">
            <span>TSP</span>
            <strong>${escapeText(options.siteTitle ?? "Tín Sinh Phát")}</strong>
          </a>
          ${renderFooterContact("⌖", "Số 2 Đông Hồ, Phường Tân Hoà, TP.HCM")}
          ${renderFooterContact("☎", "(028) 3600 2490 - 0987 59 68 79")}
          ${renderFooterContact("◷", "8h00 - 17h00")}
          ${renderFooterContact("@", "tien.lavan@tinsinhphat.com")}
        </section>

        <section class="storefront-footer__links">
          <h2>Tài khoản</h2>
          <a href="/account">Đơn hàng</a>
          <a href="/cart">Giỏ hàng</a>
          <a href="/account">Tài khoản</a>
          <a href="/account#addresses">Địa chỉ</a>
          <a href="/account#profile">Thông tin</a>
        </section>

        <section class="storefront-footer__links">
          <h2>Thông tin</h2>
          <a href="/huong-dan-dat-hang-san-pham-in-an">Hướng dẫn đặt hàng sản phẩm in</a>
          <a href="/huong-dan-dat-hang-san-pham-khac">Hướng dẫn đặt hàng sản phẩm khác</a>
          <a href="/giao-hang-van-chuyen">Giao hàng & vận chuyển</a>
          <a href="/hinh-thuc-thanh-toan">Hình thức thanh toán</a>
          <a href="/lien-he">Liên hệ</a>
        </section>

        <section class="storefront-footer__links">
          <h2>Chính sách</h2>
          <a href="/bao-hanh-doi-tra-hang-va-hoan-tien">Bảo hành, đổi trả hàng</a>
          <a href="/rules">Điều khoản thoả thuận</a>
          <a href="/terms-condition">Bảo mật thông tin</a>
          <h3>Chuyển file</h3>
          <div class="storefront-footer__transfer">
            <a href="zalo:tien.lavan" aria-label="Zalo">Z</a>
            <a href="skype:tien.lavan?chat" aria-label="Skype">S</a>
            <a href="mailto:tien.lavan@tinsinhphat.com" aria-label="Email">@</a>
          </div>
        </section>
      </div>

      <div class="storefront-footer__secondary">
        <div class="storefront-container storefront-footer__secondary-grid">
          <section>
            <h2>Đăng ký thông tin</h2>
            <form class="storefront-footer__signup" action="/lien-he">
              <input type="email" name="email" placeholder="Email của bạn" aria-label="Email của bạn">
              <button type="submit">Đăng ký</button>
            </form>
          </section>
          <section>
            <h2>Chúng tôi trên mạng xã hội</h2>
            <div class="storefront-footer__socials">
              <a href="/" aria-label="Facebook">f</a>
              <a href="/" aria-label="Instagram">ig</a>
              <a href="/" aria-label="YouTube">yt</a>
              <a href="mailto:support@tinsinhphat.com" aria-label="Email">@</a>
            </div>
          </section>
          <section>
            <h2>Phương thức thanh toán</h2>
            <div class="storefront-footer__payments">
              <span>VISA</span>
              <span>ATM</span>
              <span>COD</span>
              <span>BANK</span>
            </div>
          </section>
        </div>
      </div>

      <div class="storefront-footer__copyright">
        <div class="storefront-container">
          Copyright 2026 © <strong>${escapeText(options.siteTitle ?? "Tín Sinh Phát")}</strong>
        </div>
      </div>
    </footer>
  `);
}

function renderFooterContact(icon, text) {
  return `
    <div class="storefront-footer__contact">
      <span>${escapeText(icon)}</span>
      <p>${escapeText(text)}</p>
    </div>
  `;
}
