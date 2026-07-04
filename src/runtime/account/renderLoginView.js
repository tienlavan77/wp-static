import renderAccountShell from "./renderAccountShell.js";

export default function renderLoginView(options = {}) {
  const action = options.action ?? "/account/login";
  const redirectTo = options.redirectTo ?? "/account";

  return renderAccountShell({
    active: "login",
    body: [
      `      <form method="post" action="${action}" class="account-login">`,
      '        <label>Email <input name="email" type="email" autocomplete="email" required></label>',
      '        <label>Mật khẩu <input name="password" type="password" autocomplete="current-password" required></label>',
      `        <input type="hidden" name="redirectTo" value="${redirectTo}">`,
      '        <button type="submit">Đăng nhập</button>',
      "      </form>"
    ].join("\n"),
    title: "Đăng nhập"
  });
}
