import assert from "node:assert/strict";
import test from "node:test";
import {
  renderAccountDashboard,
  renderAddressBookView,
  renderLoginView,
  renderLogoutView,
  renderOrderHistoryView
} from "../framework/src/index.js";

test("account UI renders login and logout views", () => {
  const login = renderLoginView();
  const logout = renderLogoutView();

  assert.match(login, /<form method="post" action="\/account\/login"/);
  assert.match(login, /autocomplete="email"/);
  assert.match(logout, /<form method="post" action="\/account\/logout"/);
  assert.match(logout, /Đăng xuất/);
});

test("account UI renders dashboard with escaped customer data", () => {
  const dashboard = renderAccountDashboard({
    email: "a@example.com",
    name: "<Admin>"
  });

  assert.match(dashboard, /Tài khoản/);
  assert.match(dashboard, /&lt;Admin&gt;/);
  assert.doesNotMatch(dashboard, /<Admin>/);
});

test("account UI renders order history", () => {
  const orders = renderOrderHistoryView([
    {
      id: "1001",
      status: "processing",
      total: "1.200.000 VND"
    }
  ]);

  assert.match(orders, /Đơn hàng/);
  assert.match(orders, /1001/);
  assert.match(orders, /processing/);
});

test("account UI renders address book and empty state", () => {
  const withAddress = renderAddressBookView([
    {
      city: "TP.HCM",
      label: "Nhà riêng",
      line1: "123 Nguyễn Trãi",
      name: "Tiến"
    }
  ]);
  const empty = renderAddressBookView([]);

  assert.match(withAddress, /Nhà riêng/);
  assert.match(withAddress, /123 Nguyễn Trãi/);
  assert.match(empty, /Chưa có địa chỉ/);
});
