const CATALOG = [
  ["checkout.cart.empty", presentation("Giỏ hàng đang trống", "Anh hãy thêm ít nhất một sản phẩm trước khi đặt hàng.", "Quay lại chọn sản phẩm", "edit-cart")],
  ["checkout.customer.", presentation("Thiếu thông tin đặt hàng", "Anh kiểm tra và điền đủ các trường bắt buộc trước khi gửi đơn.", "Kiểm tra thông tin", "edit-checkout")],
  ["checkout.payment.required", presentation("Chưa chọn thanh toán", "Anh hãy chọn hình thức thanh toán trước khi gửi đơn.", "Chọn thanh toán", "edit-checkout")],
  ["checkout.cart.product.invalid", presentation("Sản phẩm cần được chọn lại", "Sản phẩm hoặc cấu hình đã chọn không còn hợp lệ. Anh hãy quay lại sản phẩm và chọn lại cấu hình.", "Chọn lại sản phẩm", "edit-cart")],
  ["cart.item.not_found", presentation("Sản phẩm không còn trong giỏ", "Giỏ hàng đã thay đổi. Anh hãy tải lại trang để xem thông tin mới nhất.", "Tải lại giỏ hàng", "reload")],
  ["cart.quantity.invalid", presentation("Số lượng chưa hợp lệ", "Anh hãy nhập số lượng từ 1 trở lên.", "Sửa số lượng", "edit-cart")],
  ["auth.", presentation("Không thể xác thực tài khoản", "Thông tin đăng nhập hoặc phiên làm việc chưa hợp lệ. Anh hãy đăng nhập lại.", "Đăng nhập lại", "sign-in")],
  ["account.", presentation("Tài khoản chưa thể cập nhật", "Thông tin tài khoản chưa được lưu. Anh kiểm tra lại các trường vừa nhập rồi thử lại.", "Kiểm tra thông tin", "edit-account")],
  ["forms.", presentation("Biểu mẫu chưa được gửi", "Anh kiểm tra các trường bắt buộc rồi thử gửi lại.", "Kiểm tra biểu mẫu", "edit-form")],
  ["search.", presentation("Chưa thể tìm kiếm", "Dữ liệu tìm kiếm đang tạm thời chưa sẵn sàng. Anh hãy thử lại sau ít phút.", "Thử lại", "retry")],
  ["source.", presentation("Chưa thể kết nối nguồn dữ liệu", "Thông tin kết nối chưa hợp lệ hoặc website nguồn chưa phản hồi. Hãy kiểm tra lại và thử lại.", "Kiểm tra kết nối", "edit-source")],
  ["wordpress.", presentation("WordPress chưa phản hồi", "Không thể hoàn tất thao tác với WordPress. Hãy kiểm tra kết nối và thử lại.", "Thử lại", "retry")],
  ["webhook.", presentation("Webhook chưa sẵn sàng", "Website chưa thể nhận thông báo thay đổi. Hãy kiểm tra cấu hình rồi thử lại.", "Kiểm tra webhook", "edit-webhook")],
  ["setup.", presentation("Thiết lập chưa hoàn tất", "Một bước cấu hình cần được kiểm tra trước khi tiếp tục.", "Kiểm tra thiết lập", "edit-setup")],
  ["build.", presentation("Chưa thể xuất bản website", "Hệ thống chưa tạo được phiên bản website mới. Nội dung đang hiển thị vẫn được giữ nguyên.", "Thử build lại", "retry")],
  ["runtime.site.not_found", presentation("Website chưa được cấu hình", "Tên miền này chưa được liên kết với một website trong WPSC.", "Liên hệ quản trị viên", "contact-support")]
];

// This is presentation metadata only. Services remain owners of diagnostic codes.
export default function createUserDiagnosticPresentation(diagnostic = {}) {
  const code = String(diagnostic.code ?? "");
  const providerCode = String(diagnostic.detail ?? "").toLowerCase();
  const message = String(diagnostic.message ?? "");
  const providerPresentation = resolveProviderPresentation(providerCode, message);
  const catalogPresentation = CATALOG.find(([prefix]) => code === prefix || code.startsWith(prefix))?.[1];
  const resolved = providerPresentation ?? catalogPresentation ?? fallback(diagnostic.severity);

  return {
    ...resolved,
    reference: providerCode || code || "wpsc.unknown"
  };
}

function resolveProviderPresentation(providerCode, message) {
  if (providerCode.includes("coupon") || /coupon|mã ưu đãi/i.test(message)) {
    return presentation("Mã ưu đãi không áp dụng được", "Mã ưu đãi không hợp lệ, đã hết hạn hoặc không áp dụng cho đơn hàng này.", "Xóa hoặc đổi mã ưu đãi", "edit-coupon");
  }
  if (providerCode.includes("variation") || providerCode.includes("product")) {
    return presentation("Sản phẩm cần được chọn lại", "Sản phẩm hoặc cấu hình đã chọn không còn hợp lệ. Anh hãy chọn lại trước khi đặt hàng.", "Chọn lại sản phẩm", "edit-cart");
  }
  if (providerCode.includes("payment")) {
    return presentation("Thanh toán chưa khả dụng", "Hình thức thanh toán này hiện chưa khả dụng. Anh hãy chọn phương thức khác hoặc liên hệ hỗ trợ.", "Chọn phương thức khác", "edit-checkout");
  }
  if (providerCode.includes("stock") || providerCode.includes("inventory")) {
    return presentation("Sản phẩm vừa hết khả dụng", "Số lượng hoặc cấu hình sản phẩm đã thay đổi. Anh hãy cập nhật lại giỏ hàng.", "Cập nhật giỏ hàng", "edit-cart");
  }
  return null;
}

function fallback(severity) {
  if (severity === "warning") return presentation("Có thông tin cần lưu ý", "Thao tác đã hoàn tất nhưng có một thông tin anh nên kiểm tra.", "Xem lại thông tin", "review");
  return presentation("Thao tác chưa hoàn tất", "Hệ thống chưa thể hoàn tất thao tác này. Anh hãy thử lại; nếu lỗi tiếp diễn, hãy liên hệ hỗ trợ.", "Thử lại", "retry");
}

function presentation(title, message, action, actionId) {
  return Object.freeze({ action, actionId, message, retryable: actionId === "retry", title });
}
