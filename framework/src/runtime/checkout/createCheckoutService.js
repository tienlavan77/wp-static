import deepFreeze from "../../shared/deepFreeze.js";

export const CHECKOUT_CONTRACT_SCHEMA = "wpsc.checkout";
export const CHECKOUT_CONTRACT_VERSION = 1;

// Checkout owns customer intent and validation; the injected provider owns the order.
export default function createCheckoutService(options = {}) {
  const siteId = String(options.siteId ?? "default").trim();
  const submitProvider = options.submitProvider;
  const syncCart = options.syncCart;
  if (!siteId) throw new TypeError("Checkout Service requires a Site id.");

  function read(session) {
    assertSession(session);
    return createContract(session, session.checkout ?? {});
  }

  function validate(session, input = {}) {
    assertSession(session);
    const state = normalizeInput(input);
    const errors = [];
    if (!session.cart.length) errors.push(error("checkout.cart.empty", "Cart must contain at least one item."));
    if (!state.customer.email) errors.push(error("checkout.customer.email.required", "Customer email is required."));
    if (!state.customer.name) errors.push(error("checkout.customer.name.required", "Customer name is required."));
    if (!state.customer.address) errors.push(error("checkout.customer.address.required", "Customer address is required."));
    if (!state.payment.method) errors.push(error("checkout.payment.required", "Payment method is required."));
    const result = createContract(session, { ...state, status: errors.length ? "invalid" : "ready" }, errors);
    session.checkout = state;
    return result;
  }

  async function submit(session, input = {}) {
    // Legacy/static clients may have a browser cart before a Runtime session exists.
    if (!session.cart.length && Array.isArray(input.items) && input.items.length && typeof syncCart === "function") {
      try {
        await syncCart(session, input.items);
      } catch (cause) {
        return createContract(session, { status: "error" }, [error("checkout.cart.sync.failed", cause.message)]);
      }
    }
    const state = validate(session, input);
    if (state.diagnostics.errors.length) return state;
    if (typeof submitProvider !== "function") return createContract(session, { ...session.checkout, status: "error" }, [error("checkout.provider.unavailable", "Checkout provider is not configured.")]);
    try {
      const payload = {
        ...input,
        items: session.cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          variationId: item.variationId,
          variant: item.variationId ? { id: item.variationId } : undefined
        }))
      };
      const result = await submitProvider({ cart: session.cart, payload, session, siteId });
      if (result?.status >= 400 || result?.error) return createContract(session, { ...session.checkout, status: "error", result }, [error("checkout.provider.failed", result.error ?? "Checkout provider rejected the order.")]);
      session.checkout = { ...session.checkout, status: "submitted", result };
      return deepFreeze({ ...result, checkout: createContract(session, session.checkout) });
    } catch (cause) {
      const providerCode = String(cause?.providerCode ?? "").trim();
      return createContract(session, { ...session.checkout, status: "error" }, [error(
        providerCode ? "checkout.provider.rejected" : cause?.code ?? "checkout.provider.failed",
        cause.message,
        providerCode || null
      )]);
    }
  }

  function createContract(session, state, errors = []) {
    return deepFreeze({
      checkoutId: session.id,
      diagnostics: { errors, warnings: [] },
      payment: state.payment ?? { method: null },
      schema: CHECKOUT_CONTRACT_SCHEMA,
      schemaVersion: CHECKOUT_CONTRACT_VERSION,
      shipping: state.shipping ?? { address: null, method: null },
      siteId,
      status: state.status ?? "idle",
      customer: state.customer ?? { address: null, email: null, name: null, phone: null },
      result: state.result ?? null
    });
  }

  function assertSession(session) {
    if (!session || session.siteId !== siteId || !Array.isArray(session.cart)) throw new Error("Checkout session Site mismatch.");
  }

  return Object.freeze({ read, submit, validate, siteId });
}

function normalizeInput(input) {
  const customer = input.customer ?? {};
  const shipping = input.shipping ?? {};
  return {
    customer: {
      address: String(customer.address ?? "").trim(),
      email: String(customer.email ?? "").trim(),
      name: String(customer.name ?? "").trim(),
      phone: String(customer.phone ?? "").trim()
    },
    payment: { method: String(input.payment ?? input.paymentMethod ?? "").trim() },
    shipping: { address: String(shipping.address ?? customer.address ?? "").trim(), method: String(input.shipment ?? shipping.method ?? "").trim() }
  };
}

function error(code, message, detail = null) {
  return { code, ...(detail ? { detail } : {}), message, severity: "error" };
}
