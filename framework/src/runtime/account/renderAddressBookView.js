import escapeHtml from "../../shared/escapeHtml.js";
import renderAccountShell from "./renderAccountShell.js";

export default function renderAddressBookView(addresses = []) {
  const items = addresses.map((address) => [
    '        <article class="account-address">',
    `          <h2>${escapeHtml(address.label ?? "Địa chỉ")}</h2>`,
    `          <p>${escapeHtml(address.name ?? "")}</p>`,
    `          <p>${escapeHtml(address.line1 ?? "")}</p>`,
    `          <p>${escapeHtml(address.city ?? "")}</p>`,
    "        </article>"
  ].join("\n")).join("\n");

  return renderAccountShell({
    active: "addresses",
    body: [
      '      <section class="account-addresses">',
      items || "        <p>Chưa có địa chỉ.</p>",
      "      </section>"
    ].join("\n"),
    title: "Địa chỉ"
  });
}
