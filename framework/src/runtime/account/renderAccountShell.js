import escapeHtml from "../../shared/escapeHtml.js";

export default function renderAccountShell(options = {}) {
  const title = options.title ?? "Account";
  const active = options.active ?? "dashboard";
  const body = options.body ?? "";

  return [
    "<!doctype html>",
    '<html lang="vi">',
    "  <head>",
    '    <meta charset="utf-8">',
    '    <meta name="viewport" content="width=device-width, initial-scale=1">',
    `    <title>${escapeHtml(title)}</title>`,
    "  </head>",
    "  <body>",
    '    <main class="account-shell">',
    `      <h1>${escapeHtml(title)}</h1>`,
    "      <nav aria-label=\"Account\">",
    renderNavLink("/account", "dashboard", "Tài khoản", active),
    renderNavLink("/account/orders", "orders", "Đơn hàng", active),
    renderNavLink("/account/addresses", "addresses", "Địa chỉ", active),
    renderNavLink("/account/logout", "logout", "Đăng xuất", active),
    "      </nav>",
    body,
    "    </main>",
    "  </body>",
    "</html>"
  ].join("\n");
}

function renderNavLink(href, key, label, active) {
  const activeAttribute = active === key ? ' aria-current="page"' : "";

  return `        <a href="${href}"${activeAttribute}>${escapeHtml(label)}</a>`;
}
