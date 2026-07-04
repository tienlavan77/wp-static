import escapeHtml from "../../shared/escapeHtml.js";
import renderAccountShell from "./renderAccountShell.js";

export default function renderOrderHistoryView(orders = []) {
  const rows = orders.map((order) => [
    "          <tr>",
    `            <td>${escapeHtml(order.id)}</td>`,
    `            <td>${escapeHtml(order.status ?? "")}</td>`,
    `            <td>${escapeHtml(order.total ?? "")}</td>`,
    "          </tr>"
  ].join("\n")).join("\n");

  return renderAccountShell({
    active: "orders",
    body: [
      '      <section class="account-orders">',
      "        <table>",
      "          <thead><tr><th>Mã đơn</th><th>Trạng thái</th><th>Tổng</th></tr></thead>",
      `          <tbody>${rows}</tbody>`,
      "        </table>",
      "      </section>"
    ].join("\n"),
    title: "Đơn hàng"
  });
}
