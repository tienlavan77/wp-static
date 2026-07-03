export default {
  label(value) {
    return value;
  },

  price(value, currency) {
    if (typeof value !== "number") {
      return "";
    }

    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: currency ?? "VND"
    }).format(value);
  }
};
