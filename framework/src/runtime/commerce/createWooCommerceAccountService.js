import createWooCommerceClient from "../../adapters/woocommerce/woocommerceClient.js";

export default function createWooCommerceAccountService(options = {}) {
  const client = options.client ?? createWooCommerceClient(options);
  const maxOrders = options.maxOrders ?? 12;

  return {
    async accountLookup({ userId }) {
      const customerId = normalizeUserId(userId);
      const [customer, orders] = await Promise.all([
        client.getResource(`/wp-json/wc/v3/customers/${encodeURIComponent(customerId)}`),
        client.getCollection("/wp-json/wc/v3/orders", {
          customer: customerId,
          orderby: "date",
          order: "desc",
          per_page: maxOrders
        })
      ]);

      return {
        addresses: normalizeCustomerAddresses(customer),
        orders: orders.map(normalizeOrderSummary),
        user: normalizeCustomer(customer)
      };
    },

    async accountOrderLookup({ orderId, userId }) {
      const customerId = normalizeUserId(userId);
      let order;

      try {
        order = await client.getResource(`/wp-json/wc/v3/orders/${encodeURIComponent(orderId)}`);
      } catch {
        return {
          error: "Order not found.",
          status: 404
        };
      }

      if (Number(order.customer_id) !== customerId) {
        return {
          error: "Order not found.",
          status: 404
        };
      }

      const detail = normalizeOrderDetail(order);
      await attachProductLinks(detail.items, client);

      return detail;
    },

    async accountAddressUpdate({ payload, userId }) {
      const customerId = normalizeUserId(userId);
      const nextPayload = {};

      if (payload?.billing) {
        nextPayload.billing = toWooAddress(payload.billing);
      }

      if (payload?.shipping) {
        nextPayload.shipping = toWooAddress(payload.shipping);
      }

      const customer = await client.updateResource(`/wp-json/wc/v3/customers/${encodeURIComponent(customerId)}`, nextPayload);

      return {
        addresses: normalizeCustomerAddresses(customer),
        user: normalizeCustomer(customer)
      };
    },

    async accountProfileUpdate({ payload, userId }) {
      const customerId = normalizeUserId(userId);
      const customer = await client.updateResource(`/wp-json/wc/v3/customers/${encodeURIComponent(customerId)}`, {
        email: payload?.email,
        first_name: payload?.firstName,
        last_name: payload?.lastName
      });

      return {
        user: normalizeCustomer(customer)
      };
    },

    async checkoutProxy({ payload = {}, session = {} }) {
      const orderPayload = toWooOrderPayload(payload, session);
      const order = await client.createResource("/wp-json/wc/v3/orders", orderPayload);
      const detail = normalizeOrderDetail(order);
      await attachProductLinks(detail.items, client);

      return {
        ...detail,
        orderId: detail.id,
        status: 201
      };
    },

    async orderLookup({ contact, orderId }) {
      if (!orderId) {
        return {
          error: "Order id is required.",
          status: 400
        };
      }

      let order;

      try {
        order = await client.getResource(`/wp-json/wc/v3/orders/${encodeURIComponent(orderId)}`);
      } catch {
        return {
          error: "Order not found.",
          status: 404
        };
      }

      if (contact && !orderContactMatches(order, contact)) {
        return {
          error: "Order not found.",
          status: 404
        };
      }

      const detail = normalizeOrderDetail(order);
      await attachProductLinks(detail.items, client);

      return detail;
    }
  };
}

function normalizeUserId(userId) {
  const normalized = Number(userId);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error("WooCommerce account lookup requires a numeric userId.");
  }

  return normalized;
}

function normalizeCustomer(customer = {}) {
  return {
    displayName: [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.username || customer.email || "",
    email: customer.email ?? "",
    firstName: customer.first_name ?? "",
    id: customer.id,
    lastName: customer.last_name ?? "",
    username: customer.username ?? ""
  };
}

function normalizeCustomerAddresses(customer = {}) {
  return {
    billing: normalizeAddress(customer.billing),
    shipping: normalizeAddress(customer.shipping)
  };
}

function normalizeAddress(address = {}) {
  return {
    address1: address.address_1 ?? "",
    address2: address.address_2 ?? "",
    city: address.city ?? "",
    company: address.company ?? "",
    country: address.country ?? "",
    email: address.email ?? "",
    firstName: address.first_name ?? "",
    lastName: address.last_name ?? "",
    phone: address.phone ?? "",
    postcode: address.postcode ?? "",
    state: address.state ?? ""
  };
}

function normalizeOrderSummary(order = {}) {
  return {
    currency: order.currency ?? "VND",
    dateCreated: order.date_created ?? "",
    id: order.id,
    number: order.number ?? String(order.id ?? ""),
    status: order.status ?? "",
    statusLabel: normalizeOrderStatus(order.status),
    total: Number(order.total ?? 0)
  };
}

function normalizeOrderDetail(order = {}) {
  return {
    ...normalizeOrderSummary(order),
    billing: normalizeAddress(order.billing),
    shipping: normalizeAddress(order.shipping),
    items: Array.isArray(order.line_items)
      ? order.line_items.map((item) => ({
        id: item.id,
        name: item.name ?? "",
        permalink: item.permalink ?? item.product_permalink ?? "",
        price: Number(item.price ?? item.total ?? 0),
        productId: item.product_id,
        quantity: Number(item.quantity ?? 1),
        total: Number(item.total ?? 0),
        variationId: item.variation_id
      }))
      : [],
    paymentMethod: order.payment_method_title ?? order.payment_method ?? "",
    shippingTotal: Number(order.shipping_total ?? 0)
  };
}

async function attachProductLinks(items, client) {
  await Promise.all(items.map(async (item) => {
    if (!item.productId || item.permalink) {
      return;
    }

    try {
      const product = await client.getResource(`/wp-json/wc/v3/products/${encodeURIComponent(item.productId)}`);
      item.permalink = product.slug ? `/${product.slug}` : product.permalink ?? "";
    } catch {
      item.permalink = "";
    }
  }));
}

function toWooOrderPayload(payload = {}, session = {}) {
  const customer = payload.customer || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  const shippingFee = Number(payload.shippingFee ?? 0);
  const payment = String(payload.payment || "bank-transfer");
  const coupon = String(payload.coupon ?? "").trim();
  const addressParts = splitAddress(customer.address);
  const firstName = firstNameFromFullName(customer.name);
  const lastName = lastNameFromFullName(customer.name);
  const billing = {
    address_1: addressParts.address1,
    address_2: "",
    city: addressParts.city,
    company: customer.company ?? "",
    country: "VN",
    email: customer.email ?? "",
    first_name: firstName,
    last_name: lastName,
    phone: customer.phone ?? "",
    postcode: "",
    state: addressParts.state
  };
  const shipping = {
    ...billing,
    email: "",
    phone: ""
  };

  const lineItems = items.map(toWooLineItem).filter(Boolean);

  // Never ask WooCommerce to create an order with no valid product lines.
  // Product IDs come from the provider reference, not framework Content IDs.
  if (items.length > 0 && lineItems.length !== items.length) {
    throw createCheckoutError(
      "checkout.cart.product.invalid",
      "Cart contains no valid WooCommerce product. Refresh the product page and add the item again."
    );
  }

  return {
    billing,
    coupon_lines: coupon ? [{ code: coupon }] : [],
    customer_id: Number(session?.user?.id) || 0,
    line_items: lineItems,
    meta_data: [
      { key: "_wpsc_source", value: "wp-static" },
      { key: "_wpsc_note", value: payload.note ?? "" },
      { key: "_wpsc_coupon", value: coupon },
      { key: "_wpsc_payment_label", value: payload.paymentLabel ?? "" },
      { key: "_wpsc_shipment_label", value: payload.shipmentLabel ?? "" }
    ],
    payment_method: payment,
    payment_method_title: payload.paymentLabel || (payment === "quote-first" ? "Báo giá trước khi thanh toán" : "Chuyển khoản ngân hàng"),
    set_paid: false,
    shipping,
    shipping_lines: shippingFee > 0
      ? [{
        method_id: payload.shipment || "local-delivery",
        method_title: payload.shipmentLabel || "Giao hàng",
        total: String(shippingFee)
      }]
      : [],
    status: "pending"
  };
}

function createCheckoutError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function toWooLineItem(item = {}) {
  const productId = Number(item.productId);
  const variationId = Number(item.variant?.id ?? item.variationId ?? 0);
  const quantity = Number(item.quantity ?? 1);

  if (!Number.isInteger(productId) || productId <= 0) {
    return null;
  }

  return {
    product_id: productId,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    variation_id: Number.isInteger(variationId) && variationId > 0 ? variationId : undefined
  };
}

function splitAddress(address = "") {
  const parts = String(address || "").split(",").map((part) => part.trim()).filter(Boolean);

  return {
    address1: parts.shift() || String(address || ""),
    city: parts.pop() || "",
    state: parts.pop() || ""
  };
}

function firstNameFromFullName(name = "") {
  return String(name || "").trim().split(/\s+/).slice(0, -1).join(" ") || String(name || "").trim();
}

function lastNameFromFullName(name = "") {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function orderContactMatches(order = {}, contact = "") {
  const normalized = normalizeContact(contact);
  const email = normalizeContact(order.billing?.email);
  const phone = normalizeContact(order.billing?.phone);

  return normalized !== "" && (normalized === email || normalized === phone);
}

function normalizeContact(value = "") {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function toWooAddress(address = {}) {
  return {
    address_1: address.address1 ?? address.address_1 ?? "",
    address_2: address.address2 ?? address.address_2 ?? "",
    city: address.city ?? "",
    company: address.company ?? "",
    country: address.country ?? "",
    email: address.email ?? "",
    first_name: address.firstName ?? address.first_name ?? "",
    last_name: address.lastName ?? address.last_name ?? "",
    phone: address.phone ?? "",
    postcode: address.postcode ?? "",
    state: address.state ?? ""
  };
}

function normalizeOrderStatus(status) {
  const labels = {
    cancelled: "Đã hủy",
    completed: "Hoàn tất",
    failed: "Thất bại",
    "on-hold": "Tạm giữ",
    pending: "Chờ thanh toán",
    processing: "Đang xử lý",
    refunded: "Hoàn tiền"
  };

  return labels[status] ?? status ?? "";
}
