import renderAccountShell from "./renderAccountShell.js";

export default function renderLogoutView(options = {}) {
  const action = options.action ?? "/account/logout";

  return renderAccountShell({
    active: "logout",
    body: [
      `      <form method="post" action="${action}" class="account-logout">`,
      "        <p>Bạn muốn đăng xuất khỏi tài khoản?</p>",
      '        <button type="submit">Đăng xuất</button>',
      "      </form>"
    ].join("\n"),
    title: "Đăng xuất"
  });
}
