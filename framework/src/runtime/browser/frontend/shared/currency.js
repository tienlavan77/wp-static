export function formatCurrency(value, currency) {
  var number = Number(value);

  if (!Number.isFinite(number)) {
    return "Liên hệ";
  }

  return new Intl.NumberFormat("vi-VN", {
    currency: currency || "VND",
    style: "currency"
  }).format(number);
}
