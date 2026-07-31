import escapeHtml from "../../shared/escapeHtml.js";
import renderAccountShell from "./renderAccountShell.js";

export default function renderAccountDashboard(customer = {}) {
  const name = customer.name ?? customer.email ?? "Khách hàng";

  return renderAccountShell({
    active: "dashboard",
    body: [
      '      <section class="account-dashboard">',
      `        <p>Xin chào ${escapeHtml(name)}.</p>`,
      `        <p>Email: ${escapeHtml(customer.email ?? "")}</p>`,
      "      </section>"
    ].join("\n"),
    title: "Tài khoản"
  });
}
