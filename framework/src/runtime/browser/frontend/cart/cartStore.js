export var cartStorageKey = "wpsc-cart";
export var couponStorageKey = "wpsc-coupon";

export function readStoredCart() {
  try {
    var parsed = JSON.parse(localStorage.getItem(cartStorageKey) || "[]");
    if (!Array.isArray(parsed)) return [];

    // Migrate carts created before storefront actions used WooCommerce IDs.
    var migrated = parsed.map(migrateLegacyWooCommerceProductId);
    if (migrated.some(function (item, index) { return item !== parsed[index]; })) {
      localStorage.setItem(cartStorageKey, JSON.stringify(migrated));
    }
    return migrated;
  } catch (error) {
    return [];
  }
}

function migrateLegacyWooCommerceProductId(item) {
  var legacyId = String(item?.productId || "");
  var match = /^product-([1-9]\d*)$/.exec(legacyId);

  return match ? { ...item, productId: match[1] } : item;
}

export function writeStoredCart(items) {
  localStorage.setItem(cartStorageKey, JSON.stringify(items));
}

export function readStoredCoupon() {
  return String(localStorage.getItem(couponStorageKey) || "").trim();
}

export function writeStoredCoupon(value) {
  var coupon = String(value || "").trim();

  if (coupon) {
    localStorage.setItem(couponStorageKey, coupon);
  } else {
    localStorage.removeItem(couponStorageKey);
  }

  return coupon;
}

export function cartItemKey(item) {
  return String(item.productId || "") + "::" + String(item.variant && item.variant.id || "");
}

export function cartItemQuantity(item) {
  return Math.max(1, Number(item.quantity) || 1);
}

export function cartTotal(items) {
  return items.reduce(function (sum, item) {
    var price = item.variant ? Number(item.variant.price) : 0;
    return sum + (Number.isFinite(price) ? price * cartItemQuantity(item) : 0);
  }, 0);
}

export function cartQuantityTotal(items) {
  return items.reduce(function (sum, item) {
    return sum + cartItemQuantity(item);
  }, 0);
}
