import deepFreeze from "../../shared/deepFreeze.js";
import { normalizeCartItem } from "./cartItems.js";

export const CART_CONTRACT_SCHEMA = "wpsc.cart";
export const CART_CONTRACT_VERSION = 1;

export default function createCartService(options = {}) {
  const siteId = String(options.siteId ?? "default").trim();
  const resolveItems = options.resolveItems;
  if (!siteId) throw new TypeError("Cart Service requires a Site id.");

  function read(session) {
    assertSession(session);
    return createContract(session);
  }

  function add(session, input) {
    assertSession(session);
    const item = normalizeCartItem(input);
    const existing = session.cart.find((entry) => entry.key === item.key);
    if (existing) existing.quantity += item.quantity;
    else session.cart.push(item);
    return createContract(session);
  }

  function update(session, key, input = {}) {
    assertSession(session);
    const item = session.cart.find((entry) => entry.key === String(key));
    if (!item) return failure("cart.item.not_found", "Cart item was not found.");
    const quantity = Number(input.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) return failure("cart.quantity.invalid", "Cart quantity must be zero or greater.");
    if (quantity === 0) session.cart = session.cart.filter((entry) => entry.key !== item.key);
    else item.quantity = quantity;
    return createContract(session);
  }

  function remove(session, key) {
    assertSession(session);
    session.cart = session.cart.filter((item) => item.key !== String(key) && String(item.productId) !== String(key));
    return createContract(session);
  }

  function clear(session) {
    assertSession(session);
    session.cart = [];
    return createContract(session);
  }

  async function refresh(session) {
    assertSession(session);
    if (typeof resolveItems !== "function") return createContract(session);
    const resolved = await resolveItems({ items: session.cart.map((item) => ({ ...item })), session, siteId });
    if (!Array.isArray(resolved)) return failure("cart.refresh.invalid", "Commerce provider must return resolved cart items.");
    const byKey = new Map(resolved.map((item) => [normalizeCartItem(item).key, item]));
    session.cart = session.cart.map((item) => ({ ...item, ...normalizeProviderState(byKey.get(item.key), item) }));
    return createContract(session);
  }

  function createContract(session) {
    const items = session.cart.map((item) => normalizeContractItem(item));
    const subtotal = items.reduce((total, item) => total + (item.pricing.lineTotal ?? 0), 0);
    const currency = items.find((item) => item.pricing.currency)?.pricing.currency ?? null;
    return deepFreeze({
      cartId: session.id,
      diagnostics: { errors: [], warnings: [] },
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      items,
      schema: CART_CONTRACT_SCHEMA,
      schemaVersion: CART_CONTRACT_VERSION,
      siteId,
      totals: { currency, subtotal, total: subtotal }
    });
  }

  function assertSession(session) {
    if (!session || session.siteId !== siteId || !Array.isArray(session.cart)) throw new Error("Cart session Site mismatch.");
  }

  return Object.freeze({ add, clear, read, refresh, remove, siteId, update });
}

function normalizeProviderState(resolved, original) {
  if (!resolved) return { available: false, currency: original.currency ?? null, inStock: false, unitPrice: original.unitPrice ?? null };
  return {
    available: resolved.available !== false,
    currency: resolved.currency ?? original.currency ?? null,
    inStock: resolved.inStock !== false,
    unitPrice: numberOrNull(resolved.unitPrice ?? resolved.price)
  };
}

function normalizeContractItem(item) {
  const unitPrice = numberOrNull(item.unitPrice);
  return {
    available: item.available ?? null,
    inStock: item.inStock ?? null,
    key: item.key,
    pricing: {
      currency: item.currency ?? null,
      lineTotal: unitPrice === null ? null : unitPrice * item.quantity,
      unitPrice
    },
    product: { id: String(item.productId) },
    quantity: item.quantity,
    variation: item.variationId ? { id: String(item.variationId) } : null
  };
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function failure(code, message) {
  return deepFreeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false });
}
