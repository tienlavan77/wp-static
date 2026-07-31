export var defaultBankTransferConfig = {
  accountName: "TIN SINH PHAT",
  accountNumber: "CAP_NHAT_SO_TAI_KHOAN",
  bankCode: "CAP_NHAT_MA_NGAN_HANG",
  bankName: "Cập nhật ngân hàng"
};

export function transferMemo(order) {
  return "Thanh toan don hang " + (order && order.id ? order.id : "TSP");
}

export function bankTransferAmount(order) {
  var total = Number(order && order.total);
  return Number.isFinite(total) && total > 0 ? Math.round(total) : 0;
}

export function bankQrUrl(order, config) {
  var bankTransferConfig = config || defaultBankTransferConfig;
  var memo = transferMemo(order);
  var amount = bankTransferAmount(order);
  var hasVietQrConfig = bankTransferConfig.bankCode &&
    bankTransferConfig.accountNumber &&
    !String(bankTransferConfig.bankCode).startsWith("CAP_NHAT") &&
    !String(bankTransferConfig.accountNumber).startsWith("CAP_NHAT");

  if (hasVietQrConfig) {
    return "https://img.vietqr.io/image/" +
      encodeURIComponent(bankTransferConfig.bankCode) + "-" +
      encodeURIComponent(bankTransferConfig.accountNumber) +
      "-compact2.png?amount=" + encodeURIComponent(amount) +
      "&addInfo=" + encodeURIComponent(memo) +
      "&accountName=" + encodeURIComponent(bankTransferConfig.accountName);
  }

  return "https://quickchart.io/qr?size=260&text=" + encodeURIComponent([
    "NGAN HANG: " + bankTransferConfig.bankName,
    "SO TAI KHOAN: " + bankTransferConfig.accountNumber,
    "TEN TAI KHOAN: " + bankTransferConfig.accountName,
    "SO TIEN: " + amount,
    "NOI DUNG: " + memo
  ].join("\n"));
}
