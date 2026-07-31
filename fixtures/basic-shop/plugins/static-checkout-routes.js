export default function staticCheckoutRoutesPlugin() {
  return {
    name: "static-checkout-routes",

    data(data) {
      return {
        ...data,
        contents: [
          ...data.contents,
          {
            id: "page-thank-you",
            type: "page",
            title: "Hoàn tất đặt hàng",
            slug: "thank-you",
            data: {
              description: "Trang xác nhận đơn hàng sau khi khách gửi thông tin đặt hàng.",
              checkoutRoute: true
            }
          },
          {
            id: "page-search",
            type: "search",
            title: "Tìm kiếm",
            slug: "search",
            data: {
              description: "Trang tìm kiếm sản phẩm, danh mục và nội dung từ dữ liệu tĩnh."
            }
          },
          {
            id: "page-account",
            type: "account",
            title: "Tài khoản",
            slug: "account",
            data: {
              description: "Khu vực tài khoản khách hàng."
            }
          },
          {
            id: "page-404",
            type: "page",
            title: "Không tìm thấy trang",
            slug: "404",
            data: {
              description: "Trang anh cần tìm có thể đã đổi địa chỉ hoặc không còn tồn tại.",
              notFoundPage: true
            }
          }
        ]
      };
    }
  };
}
