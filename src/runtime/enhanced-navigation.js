import { normalizeAccountSession } from "./frontend/account/accountState.js";
import {
  cartItemKey,
  cartItemQuantity,
  cartQuantityTotal,
  cartTotal,
  readStoredCart,
  readStoredCoupon,
  writeStoredCart,
  writeStoredCoupon
} from "./frontend/cart/cartStore.js";
import {
  bankQrUrl as createBankQrUrl,
  bankTransferAmount,
  defaultBankTransferConfig,
  transferMemo
} from "./frontend/checkout/bankTransfer.js";
import { normalizeNavigationPath, routeDataUrl, sameOriginLink } from "./frontend/navigation/path.js";
import { isQuantityAttribute, sameVariantValue } from "./frontend/product/variantUtils.js";
import {
  getSearchExcerpt,
  getSearchImage,
  getSearchQuery,
  getSearchType,
  getSearchTypeLabel
} from "./frontend/search/searchUtils.js";
import { formatCurrency } from "./frontend/shared/currency.js";
import { escapeHtml, normalizeText, stripHtml } from "./frontend/shared/text.js";

(function () {
  var mainSelector = "main";
  var recentlyViewedStorageKey = "wpsc-recently-viewed-products";
  var accountSessionCache = null;
  var accountSessionPromise = null;
  var accountSessionRequestId = 0;
  var searchIndexPromise = null;
  var routePrefetchCache = new Map();
  var routePrefetchLimit = 24;
  var transitionMs = 80;
  var bankTransferConfig = defaultBankTransferConfig;

  if (!window.fetch || !window.history || !document.querySelector(mainSelector)) {
    return;
  }

  function syncThemeToggle() {
    var buttons = document.querySelectorAll("[data-storefront-theme-toggle]");
    var isDark = document.documentElement.dataset.theme === "dark";

    buttons.forEach(function (button) {
      var label = button.querySelector("[data-theme-label]");
      var icon = button.querySelector("[data-theme-icon]");

      button.setAttribute("aria-pressed", isDark ? "true" : "false");

      if (label) {
        label.textContent = isDark ? "Light" : "Dark";
      }

      if (icon) {
        icon.textContent = isDark ? "☀" : "☾";
      }
    });
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("wpsc-theme", theme);
    syncThemeToggle();
  }

  function toggleDescription(button) {
    var root = button.closest("[data-collapsible-description]");
    if (!root) return;

    var preview = root.querySelector("[data-description-preview]");
    var full = root.querySelector("[data-description-full]");
    var expanded = button.getAttribute("aria-expanded") === "true";

    if (!preview || !full) return;

    preview.hidden = !expanded;
    full.hidden = expanded;
    button.textContent = expanded ? "Xem thêm" : "Thu gọn";
    button.setAttribute("aria-expanded", expanded ? "false" : "true");
  }

  function switchProductTab(button) {
    var root = button.closest("[data-product-tabs]");
    var target = button.dataset.productTab;
    if (!root || !target) return;

    root.querySelectorAll("[data-product-tab]").forEach(function (tab) {
      tab.setAttribute("aria-selected", tab === button ? "true" : "false");
    });

    root.querySelectorAll("[data-product-tab-panel]").forEach(function (panel) {
      panel.hidden = panel.dataset.productTabPanel !== target;
    });
  }

  function switchProductGalleryImage(button) {
    var gallery = button.closest(".storefront-product-gallery");
    var mainImage = gallery && gallery.querySelector("[data-product-gallery-image]");
    var nextSrc = button.dataset.imageSrc;
    var nextAlt = button.dataset.imageAlt || "";

    if (!mainImage || !nextSrc) return;

    mainImage.src = nextSrc;
    mainImage.alt = nextAlt;

    gallery.querySelectorAll("[data-product-gallery-thumb]").forEach(function (thumb) {
      thumb.setAttribute("aria-pressed", thumb === button ? "true" : "false");
    });
  }

  function closeProductGalleryLightbox() {
    var lightbox = document.querySelector("[data-product-gallery-lightbox]");
    if (!lightbox) return;

    lightbox.remove();
    document.documentElement.classList.remove("storefront-lightbox-open");
  }

  function openProductGalleryLightbox(button) {
    var gallery = button.closest(".storefront-product-gallery");
    var image = gallery && gallery.querySelector("[data-product-gallery-image]");
    if (!image || !image.src) return;

    closeProductGalleryLightbox();

    var lightbox = document.createElement("div");
    lightbox.className = "storefront-product-lightbox";
    lightbox.dataset.productGalleryLightbox = "true";
    lightbox.innerHTML = [
      '<button type="button" class="storefront-product-lightbox__close" data-product-gallery-lightbox-close aria-label="Đóng ảnh lớn">×</button>',
      '<figure>',
      '<img src="' + escapeHtml(image.src) + '" alt="' + escapeHtml(image.alt || "Ảnh sản phẩm") + '">',
      '</figure>'
    ].join("");

    document.body.appendChild(lightbox);
    document.documentElement.classList.add("storefront-lightbox-open");
  }

  function sortProductGrid(select) {
    var archive = select.closest(".storefront-archive");
    var grid = archive && archive.querySelector("[data-storefront-product-grid]");
    if (!grid) return;

    var cards = Array.from(grid.querySelectorAll("[data-product-card]"));
    var mode = select.value;

    cards.sort(function (a, b) {
      if (mode === "price-asc" || mode === "price-desc") {
        var priceA = Number(a.dataset.sortPrice || Number.POSITIVE_INFINITY);
        var priceB = Number(b.dataset.sortPrice || Number.POSITIVE_INFINITY);
        return mode === "price-asc" ? priceA - priceB : priceB - priceA;
      }

      if (mode === "newest") {
        return String(b.dataset.sortDate || "").localeCompare(String(a.dataset.sortDate || ""));
      }

      return 0;
    });

    cards.forEach(function (card) {
      grid.appendChild(card);
    });
  }

  function getSearchPrice(content) {
    if (!content || content.type !== "product") return "";

    var commerce = content.commerce || {};
    var data = content.data || {};
    var variants = Array.isArray(content.variants) ? content.variants : [];
    var prices = variants
      .map(function (variant) {
        return Number(variant.price || variant.salePrice || variant.regularPrice);
      })
      .filter(Number.isFinite);

    if (prices.length > 0) {
      var min = Math.min.apply(Math, prices);
      var max = Math.max.apply(Math, prices);
      return min === max
        ? formatCurrency(min, commerce.currency || data.currency)
        : formatCurrency(min, commerce.currency || data.currency) + " - " + formatCurrency(max, commerce.currency || data.currency);
    }

    return formatCurrency(commerce.price || data.price, commerce.currency || data.currency);
  }

  async function loadSearchIndex() {
    if (searchIndexPromise) return searchIndexPromise;

    searchIndexPromise = fetch("/data/search-index.json", { headers: { accept: "application/json" } })
      .then(function (response) {
        if (!response.ok) throw new Error("Search index not found");
        return response.json();
      })
      .then(function (payload) {
        return (payload.items || []).map(function (item) {
          return {
            categories: item.categories || (item.category ? [item.category] : []),
            haystack: item.keywords || normalizeText([item.title, item.slug, item.category, (item.categories || []).join(" ")].join(" ")),
            image: item.image || "",
            path: item.path,
            price: item.priceLabel || "",
            title: item.title || item.slug || item.path,
            type: item.type || "page"
          };
        });
      })
      .catch(loadSearchIndexFromRouteData);

    return searchIndexPromise;
  }

  function loadSearchIndexFromRouteData() {
    return fetch("/data/manifest.json", { headers: { accept: "application/json" } })
      .then(function (response) {
        if (!response.ok) throw new Error("Search manifest not found");
        return response.json();
      })
      .then(function (manifest) {
        var routes = (manifest.routes || []).filter(function (route) {
          return route.path !== "/search" && route.dataPath;
        });

        return Promise.all(routes.map(function (route) {
          return fetch(route.dataPath, { headers: { accept: "application/json" } })
            .then(function (response) {
              return response.ok ? response.json() : null;
            })
            .then(function (payload) {
              if (!payload || !payload.content) return null;

              var content = payload.content;
              var type = getSearchType(content);
              var excerpt = getSearchExcerpt(content);
              var categories = [
                ...(content.taxonomies && content.taxonomies.categories || []),
                ...(content.taxonomies && content.taxonomies.terms || [])
              ].map(function (term) {
                return term.name || term.label || term.slug || "";
              }).filter(Boolean);
              var haystack = normalizeText([
                content.title,
                content.slug,
                excerpt,
                categories.join(" ")
              ].join(" "));

              return {
                categories: categories,
                excerpt: excerpt,
                haystack: haystack,
                image: getSearchImage(content),
                path: payload.route && payload.route.path || route.path,
                price: getSearchPrice(content),
                title: content.title || content.slug || route.path,
                type: type
              };
            }).catch(function () {
              return null;
            });
        })).then(function (items) {
          return items.filter(Boolean);
        });
      });
  }

  function scoreSearchItem(item, query) {
    var normalizedTitle = normalizeText(item.title);
    if (normalizedTitle === query) return 100;
    if (normalizedTitle.includes(query)) return 70;
    if (item.haystack.includes(query)) return 40;
    return 0;
  }

  function renderSearchResultCard(item) {
    var isProduct = item.type === "product";
    var category = item.categories && item.categories[0] || getSearchTypeLabel(item.type);

    return [
      '<article class="storefront-search-result storefront-search-result--' + escapeHtml(item.type) + '" data-search-result-card data-search-result-href="' + escapeHtml(item.path) + '" role="link" tabindex="0">',
      '<a href="' + escapeHtml(item.path) + '" data-search-result-link data-no-enhanced-navigation>',
      '<span class="storefront-search-result__media">',
      item.image
        ? '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.title) + '" loading="lazy">'
        : '<span>' + escapeHtml(item.title.slice(0, 1)) + '</span>',
      '</span>',
      '<span class="storefront-search-result__body">',
      '<small>' + escapeHtml(category) + '</small>',
      '<strong>' + escapeHtml(item.title) + '</strong>',
      isProduct && item.price ? '<b>' + escapeHtml(item.price) + '</b>' : '',
      '</span>',
      '</a>',
      '</article>'
    ].join("");
  }

  async function renderSearchPage() {
    var root = document.querySelector("[data-search-page]");
    if (!root) return;

    var input = root.querySelector("[data-search-page-input]");
    var status = root.querySelector("[data-search-status]");
    var resultsRoot = root.querySelector("[data-search-results]");
    var filter = root.dataset.searchFilter || "all";
    var query = getSearchQuery();
    var normalizedQuery = normalizeText(query);

    if (input) input.value = query;

    if (!normalizedQuery) {
      if (status) status.textContent = "Nhập từ khóa để tìm sản phẩm và nội dung phù hợp.";
      if (resultsRoot) {
        resultsRoot.innerHTML = '<article class="storefront-search-empty"><h2>Tìm đúng sản phẩm in nhanh hơn</h2><p>Gợi ý: thử tìm theo tên sản phẩm, chất liệu, quy cách hoặc nhóm danh mục.</p></article>';
      }
      return;
    }

    if (status) status.textContent = "Đang tìm...";

    try {
      var items = await loadSearchIndex();
      var matches = items
        .map(function (item) {
          return {
            item: item,
            score: scoreSearchItem(item, normalizedQuery)
          };
        })
        .filter(function (entry) {
          return entry.score > 0 && (filter === "all" || entry.item.type === filter);
        })
        .sort(function (a, b) {
          return b.score - a.score || a.item.title.localeCompare(b.item.title);
        })
        .map(function (entry) {
          return entry.item;
        });

      root.querySelectorAll("[data-search-filter]").forEach(function (button) {
        button.classList.toggle("is-active", button.dataset.searchFilter === filter);
      });

      if (status) {
        status.textContent = matches.length > 0
          ? "Tìm thấy " + matches.length + " kết quả cho \"" + query + "\"."
          : "Không tìm thấy kết quả phù hợp cho \"" + query + "\".";
      }

      if (resultsRoot) {
        resultsRoot.innerHTML = matches.length > 0
          ? matches.slice(0, 48).map(renderSearchResultCard).join("")
          : '<article class="storefront-search-empty"><h2>Chưa có kết quả</h2><p>Thử từ khóa ngắn hơn hoặc tìm theo nhóm sản phẩm như bao thư, folder, tag giấy.</p><a class="storefront-button" href="/lien-he">Nhận tư vấn</a></article>';
      }
    } catch (error) {
      if (status) status.textContent = "Chưa tải được dữ liệu tìm kiếm.";
      if (resultsRoot) {
        resultsRoot.innerHTML = '<article class="storefront-search-empty"><h2>Không tải được dữ liệu</h2><p>Anh thử build lại site để cập nhật data/manifest.json.</p></article>';
      }
    }
  }

  function submitSearchForm(form) {
    var data = new FormData(form);
    var input = form.querySelector('input[name="s"], input[type="search"]');
    var query = String(input ? input.value : data.get("s") || "").trim();
    var url = query ? "/search?s=" + encodeURIComponent(query) : "/search";

    if (window.location.pathname === "/search") {
      var currentSearchRoot = document.querySelector("[data-search-page]");
      if (currentSearchRoot) {
        currentSearchRoot.dataset.searchFilter = "all";
      }
      window.history.pushState({ wpsc: true, path: "/search" }, "", url);
      renderSearchPage();
      return;
    }

    navigate("/search").then(function () {
      var nextSearchRoot = document.querySelector("[data-search-page]");
      if (nextSearchRoot) {
        nextSearchRoot.dataset.searchFilter = "all";
      }
      window.history.replaceState({ wpsc: true, path: "/search" }, "", url);
      renderSearchPage();
    }).catch(function () {
      window.location.href = url;
    });
  }

  function readCart() {
    return readStoredCart();
  }

  function writeCart(items) {
    writeStoredCart(items);
    updateCartCount();
  }

  function readCoupon() {
    return readStoredCoupon();
  }

  function writeCoupon(value) {
    return writeStoredCoupon(value);
  }

  function renderAccountPage() {
    var root = document.querySelector("[data-account-root]");
    if (!root) return;
    var requestId = ++accountSessionRequestId;
    var authAction = accountAuthActionFromUrl();

    if (authAction === "reset") {
      root.innerHTML = renderResetPasswordForm();
      return;
    }

    if (authAction === "verify") {
      root.innerHTML = renderVerifyEmailPanel("Đang xác nhận email...");
      verifyEmailFromUrl();
      return;
    }

    if (accountSessionCache?.user) {
      syncAccountLinks(accountSessionCache.user);
      root.innerHTML = renderAccountDashboard(accountSessionCache);
      return;
    }

    root.innerHTML = renderAccountLoading();

    fetchAccountSession()
      .then(function (payload) {
        if (requestId !== accountSessionRequestId) return;
        var user = payload && (payload.user || payload.customer || payload.account);

        if (!user) {
          syncAccountLinks(null);
          root.innerHTML = renderAccountLogin();
          return;
        }

        accountSessionCache = normalizeAccountSession(payload, user);
        syncAccountLinks(user);
        root.innerHTML = renderAccountDashboard(accountSessionCache);
      })
      .catch(function (error) {
        if (requestId !== accountSessionRequestId) return;
        syncAccountLinks(null);

        if (error && error.status === 401) {
          root.innerHTML = renderAccountLogin();
          return;
        }

        root.innerHTML = renderAccountLogin({
          message: "Chưa kết nối được API tài khoản thật. Khi cấu hình /api/account/me, trang này sẽ tự nạp dữ liệu user từ session."
        });
      });
  }

  function renderAccountLoading() {
    return [
      '<section class="storefront-account-panel storefront-account-panel--loading">',
      '<p class="storefront-kicker">Tài khoản</p>',
      '<h2>Đang kiểm tra phiên đăng nhập</h2>',
      '<p>Đang tải thông tin tài khoản của anh.</p>',
      '</section>'
    ].join("");
  }

  function renderAccountInlineStatus(message, state) {
    return '<p class="storefront-account-inline-status" data-state="' + escapeHtml(state || "info") + '">' + escapeHtml(message) + '</p>';
  }

  function setFormStatus(form, selector, message, state) {
    var status = form && form.querySelector(selector);
    if (!status) return;

    status.textContent = message;
    if (state) {
      status.dataset.state = state;
    } else {
      delete status.dataset.state;
    }
  }

  function renderAccountLogin(options) {
    var message = options && options.message;

    return [
      '<div class="storefront-account-grid">',
      '<section class="storefront-account-panel">',
      '<p class="storefront-kicker">Đăng nhập</p>',
      '<h2>Chào mừng quay lại</h2>',
      '<p>Đăng nhập bằng tài khoản khách hàng WordPress.</p>',
      message ? '<div class="storefront-account-alert">' + escapeHtml(message) + '</div>' : "",
      '<form class="storefront-account-form" data-account-login-form>',
      '<label><span>Email hoặc tên đăng nhập</span><input name="username" autocomplete="username" required placeholder="email@example.com"></label>',
      '<label><span>Mật khẩu</span><input name="password" type="password" autocomplete="current-password" required placeholder="Mật khẩu"></label>',
      '<div class="storefront-account-form__actions">',
      '<button class="storefront-button" type="submit">Đăng nhập</button>',
      '<a href="/account#lost-password" data-account-lost-password>Quên mật khẩu?</a>',
      '</div>',
      '</form>',
      '<p class="storefront-account-switch">Chưa có tài khoản? <a href="/account#register" data-account-register>Mở tài khoản mới</a></p>',
      '</section>',
      '<aside class="storefront-account-panel storefront-account-panel--muted">',
      '<h2>Tài khoản của anh</h2>',
      '<ul>',
      '<li>Xem lại đơn hàng đã đặt.</li>',
      '<li>Lưu thông tin giao hàng để đặt hàng nhanh hơn.</li>',
      '<li>Theo dõi trạng thái xử lý đơn hàng.</li>',
      '</ul>',
      '</aside>',
      '</div>'
    ].join("");
  }

  function renderAccountDashboard(state) {
    var user = state.user || {};
    var orders = Array.isArray(state.orders) ? state.orders : [];
    var addresses = state.addresses || {};
    var displayName = user.displayName || user.name || user.firstName || user.email || "Khách hàng";
    var activeView = accountViewFromPath();

    return [
      '<div class="storefront-account-dashboard">',
      '<section class="storefront-account-panel storefront-account-welcome">',
      '<div>',
      '<p class="storefront-kicker">Tài khoản</p>',
      '<h2>Xin chào, ' + escapeHtml(displayName) + '</h2>',
      '<p>' + escapeHtml(user.email || "") + '</p>',
      '</div>',
      '<button class="storefront-button-secondary" type="button" data-account-logout>Đăng xuất</button>',
      '</section>',
      '<nav class="storefront-account-nav" aria-label="Khu vực tài khoản">',
      renderAccountNavLink("orders", "Đơn hàng", activeView),
      renderAccountNavLink("addresses", "Địa chỉ", activeView),
      renderAccountNavLink("profile", "Thông tin", activeView),
      '</nav>',
      renderAccountView(activeView, { addresses: addresses, orders: orders, user: user }),
      '</div>'
    ].join("");
  }

  function renderAccountNavLink(view, label, activeView) {
    return '<a href="/account" data-account-view="' + escapeHtml(view) + '"' + (view === activeView ? ' aria-current="page"' : "") + '>' + escapeHtml(label) + '</a>';
  }

  function renderAccountView(view, state) {
    if (view === "orders") {
      return renderAccountOrdersView(state.orders);
    }

    if (view === "addresses") {
      return [
        '<div class="storefront-account-grid storefront-account-grid--dashboard">',
        '<article class="storefront-account-panel">',
        '<h2>Địa chỉ giao hàng</h2>',
        renderAccountAddressForm("shipping", state.addresses.shipping || {}),
        '</article>',
        '<article class="storefront-account-panel">',
        '<h2>Địa chỉ thanh toán</h2>',
        renderAccountAddressForm("billing", state.addresses.billing || {}),
        '</article>',
        '</div>'
      ].join("");
    }

    if (view === "profile") {
      return [
        '<section class="storefront-account-panel storefront-account-profile">',
        '<h2>Thông tin tài khoản</h2>',
        '<form class="storefront-account-form" data-account-profile-form>',
        '<label><span>Họ</span><input name="firstName" value="' + escapeHtml(state.user.firstName || "") + '"></label>',
        '<label><span>Tên</span><input name="lastName" value="' + escapeHtml(state.user.lastName || "") + '"></label>',
        '<label><span>Email</span><input name="email" type="email" value="' + escapeHtml(state.user.email || "") + '"></label>',
        '<button class="storefront-button" type="submit">Cập nhật thông tin</button>',
        '<p data-account-form-status></p>',
        '</form>',
        '<hr class="storefront-account-divider">',
        '<h2>Đổi mật khẩu</h2>',
        '<form class="storefront-account-form" data-account-change-password-form>',
        '<label><span>Mật khẩu hiện tại</span><input name="currentPassword" type="password" autocomplete="current-password" required></label>',
        '<label><span>Mật khẩu mới</span><input name="newPassword" type="password" autocomplete="new-password" minlength="8" required></label>',
        '<button class="storefront-button" type="submit">Đổi mật khẩu</button>',
        '<p data-account-form-status></p>',
        '</form>',
        '<hr class="storefront-account-divider">',
        '<h2>Xác nhận email</h2>',
        '<p class="storefront-muted">Nếu chưa nhận được email xác nhận, anh có thể gửi lại tại đây.</p>',
        '<form class="storefront-account-form" data-account-resend-verification-form>',
        '<input type="hidden" name="email" value="' + escapeHtml(state.user.email || "") + '">',
        '<button class="storefront-button-secondary" type="submit">Gửi lại email xác nhận</button>',
        '<p data-account-form-status></p>',
        '</form>',
        '</section>'
      ].join("");
    }

    return renderAccountOrdersView(state.orders);
  }

  function renderAccountOrdersView(orders) {
    return [
      '<div class="storefront-account-orders-layout">',
      '<section class="storefront-account-panel storefront-account-orders-list">',
      '<h2>Đơn hàng của anh</h2>',
      '<p class="storefront-muted">Chọn một đơn hàng để xem thông tin chi tiết ở cột bên phải.</p>',
      renderAccountOrders(orders, { pageSize: 10 }),
      '</section>',
      '<section class="storefront-account-panel storefront-account-order-detail-panel" data-account-order-panel>',
      '<h2>Thông tin đơn hàng</h2>',
      '<p class="storefront-muted">Chọn một đơn hàng ở cột bên trái để xem chi tiết.</p>',
      '</section>',
      '</div>'
    ].join("");
  }

  function renderAccountOrders(orders, options) {
    var pageSize = options?.pageSize ?? 10;
    var page = Math.max(1, Number(options?.page || accountOrderPageFromHash()) || 1);
    var totalPages = Math.max(1, Math.ceil(orders.length / pageSize));
    var safePage = Math.min(page, totalPages);
    var offset = (safePage - 1) * pageSize;

    if (!orders.length) {
      return [
        '<div class="storefront-account-empty">',
        '<strong>Chưa có đơn hàng nào</strong>',
        '<p>Khi anh đặt hàng trên website, đơn hàng sẽ xuất hiện ở đây.</p>',
        '<a class="storefront-button-secondary" href="/">Tiếp tục mua hàng</a>',
        '</div>'
      ].join("");
    }

    return [
      '<div class="storefront-account-orders">',
      orders.slice(offset, offset + pageSize).map(function (order) {
        var orderId = order.number || order.id || order.orderId || "Đơn hàng";
        var total = order.totalFormatted || (order.total ? formatCurrency(order.total, order.currency || "VND") : "");
        var status = order.statusLabel || order.status || "";

        return [
          '<a class="storefront-account-order" href="/account#orders" data-account-order-id="' + escapeHtml(order.id || orderId) + '">',
          '<span><strong>#' + escapeHtml(orderId) + '</strong><small>' + escapeHtml(status) + '</small></span>',
          total ? '<em>' + escapeHtml(total) + '</em>' : "",
          '</a>'
        ].join("");
      }).join(""),
      '</div>',
      totalPages > 1 ? renderAccountOrderPagination(safePage, totalPages) : ""
    ].join("");
  }

  function renderAccountOrderPagination(page, totalPages) {
    var items = [];

    for (var index = 1; index <= totalPages; index += 1) {
      items.push('<button type="button" data-account-orders-page="' + index + '"' + (index === page ? ' aria-current="page"' : "") + '>' + index + '</button>');
    }

    return '<nav class="storefront-account-pagination" aria-label="Trang đơn hàng">' + items.join("") + '</nav>';
  }

  function renderAccountAddress(address) {
    var lines = [
      address.name || [address.firstName, address.lastName].filter(Boolean).join(" "),
      address.phone,
      address.address1 || address.address_1,
      address.address2 || address.address_2,
      [address.city, address.state, address.postcode].filter(Boolean).join(", ")
    ].filter(Boolean);

    if (!lines.length) {
      return [
        '<div class="storefront-account-empty">',
        '<strong>Chưa có địa chỉ</strong>',
        '<p>Anh có thể cập nhật địa chỉ trong tài khoản WordPress để hệ thống tự điền khi đặt hàng.</p>',
        '</div>'
      ].join("");
    }

    return '<address class="storefront-account-address">' + lines.map(function (line) {
      return '<span>' + escapeHtml(line) + '</span>';
    }).join("") + '</address>';
  }

  function renderAccountAddressForm(type, address) {
    return [
      '<form class="storefront-account-form" data-account-address-form data-address-type="' + escapeHtml(type) + '">',
      '<label><span>Họ</span><input name="firstName" value="' + escapeHtml(address.firstName || "") + '"></label>',
      '<label><span>Tên</span><input name="lastName" value="' + escapeHtml(address.lastName || "") + '"></label>',
      '<label><span>Công ty</span><input name="company" value="' + escapeHtml(address.company || "") + '"></label>',
      '<label><span>Địa chỉ 1</span><input name="address1" value="' + escapeHtml(address.address1 || "") + '"></label>',
      '<label><span>Địa chỉ 2</span><input name="address2" value="' + escapeHtml(address.address2 || "") + '"></label>',
      '<label><span>Thành phố</span><input name="city" value="' + escapeHtml(address.city || "") + '"></label>',
      '<label><span>Tỉnh/Bang</span><input name="state" value="' + escapeHtml(address.state || "") + '"></label>',
      '<label><span>Mã bưu điện</span><input name="postcode" value="' + escapeHtml(address.postcode || "") + '"></label>',
      '<label><span>Quốc gia</span><input name="country" value="' + escapeHtml(address.country || "VN") + '"></label>',
      type === "billing" ? '<label><span>Điện thoại</span><input name="phone" value="' + escapeHtml(address.phone || "") + '"></label>' : "",
      type === "billing" ? '<label><span>Email</span><input name="email" type="email" value="' + escapeHtml(address.email || "") + '"></label>' : "",
      '<button class="storefront-button" type="submit">Lưu địa chỉ</button>',
      '<p data-account-form-status></p>',
      '</form>'
    ].join("");
  }

  function renderLostPasswordForm(message) {
    return [
      '<section class="storefront-account-panel">',
      '<p class="storefront-kicker">Mật khẩu</p>',
      '<h2>Quên mật khẩu?</h2>',
      '<p>Nhập email hoặc tên đăng nhập, hệ thống sẽ gửi hướng dẫn đặt lại mật khẩu nếu tài khoản tồn tại.</p>',
      message ? '<div class="storefront-account-alert">' + escapeHtml(message) + '</div>' : "",
      '<form class="storefront-account-form" data-account-password-reset-form>',
      '<label><span>Email hoặc tên đăng nhập</span><input name="username" required autocomplete="username"></label>',
      '<button class="storefront-button" type="submit">Gửi hướng dẫn</button>',
      '<p data-account-form-status></p>',
      '</form>',
      '<p><button class="storefront-button-secondary" type="button" data-account-show-login>Quay lại đăng nhập</button></p>',
      '</section>'
    ].join("");
  }

  function renderRegisterForm(message) {
    return [
      '<section class="storefront-account-panel">',
      '<p class="storefront-kicker">Đăng ký</p>',
      '<h2>Mở tài khoản khách hàng</h2>',
      '<p>Tạo tài khoản để xem đơn hàng, lưu địa chỉ và đặt hàng nhanh hơn.</p>',
      message ? '<div class="storefront-account-alert">' + escapeHtml(message) + '</div>' : "",
      '<form class="storefront-account-form" data-account-register-form>',
      '<label><span>Họ</span><input name="firstName" autocomplete="given-name"></label>',
      '<label><span>Tên</span><input name="lastName" autocomplete="family-name"></label>',
      '<label><span>Email *</span><input name="email" type="email" autocomplete="email" required></label>',
      '<label><span>Điện thoại</span><input name="phone" autocomplete="tel"></label>',
      '<label><span>Mật khẩu *</span><input name="password" type="password" autocomplete="new-password" minlength="8" required></label>',
      '<label class="storefront-checkout-terms"><input type="checkbox" required><span>Tôi đồng ý với <a href="/terms-conditions">điều khoản và điều kiện</a>.</span></label>',
      '<button class="storefront-button" type="submit">Đăng ký</button>',
      '<p data-account-form-status></p>',
      '</form>',
      '<p class="storefront-account-switch">Đã có tài khoản? <a href="/account" data-account-show-login>Đăng nhập</a></p>',
      '</section>'
    ].join("");
  }

  function renderResetPasswordForm(message) {
    var params = new URLSearchParams(window.location.search || "");
    return [
      '<section class="storefront-account-panel">',
      '<p class="storefront-kicker">Mật khẩu</p>',
      '<h2>Đặt lại mật khẩu</h2>',
      '<p>Nhập mật khẩu mới cho tài khoản của anh.</p>',
      message ? '<div class="storefront-account-alert">' + escapeHtml(message) + '</div>' : "",
      '<form class="storefront-account-form" data-account-reset-password-form>',
      '<input type="hidden" name="login" value="' + escapeHtml(params.get("reset_login") || "") + '">',
      '<input type="hidden" name="token" value="' + escapeHtml(params.get("reset_token") || "") + '">',
      '<label><span>Mật khẩu mới</span><input name="password" type="password" autocomplete="new-password" minlength="8" required></label>',
      '<button class="storefront-button" type="submit">Đặt lại mật khẩu</button>',
      '<p data-account-form-status></p>',
      '</form>',
      '</section>'
    ].join("");
  }

  function renderVerifyEmailPanel(message) {
    return [
      '<section class="storefront-account-panel">',
      '<p class="storefront-kicker">Email</p>',
      '<h2>Xác nhận email</h2>',
      '<div class="storefront-account-alert">' + escapeHtml(message || "Đang xử lý xác nhận email.") + '</div>',
      '<p><button class="storefront-button-secondary" type="button" data-account-show-login>Quay lại đăng nhập</button></p>',
      '</section>'
    ].join("");
  }

  function fetchAccountSession(options) {
    var force = options?.force === true;

    if (!force && accountSessionCache?.user) {
      return Promise.resolve(accountSessionCache);
    }

    if (!force && accountSessionPromise) {
      return accountSessionPromise;
    }

    accountSessionPromise = accountRequest("/api/account/me", {
      method: "GET"
    }).then(function (payload) {
      var user = payload && (payload.user || payload.customer || payload.account);
      accountSessionCache = user ? normalizeAccountSession(payload, user) : null;
      accountSessionPromise = null;
      return accountSessionCache || payload;
    }).catch(function (error) {
      accountSessionPromise = null;
      throw error;
    });

    return accountSessionPromise;
  }

  function loginAccount(form) {
    var formData = new FormData(form);

    accountSessionCache = null;
    accountSessionPromise = null;

    return accountRequest("/api/auth/login", {
      body: JSON.stringify({
        password: String(formData.get("password") || ""),
        username: String(formData.get("username") || "").trim()
      }),
      method: "POST"
    });
  }

  function passwordResetAccount(form) {
    var formData = new FormData(form);

    return accountRequest("/api/account/password-reset", {
      body: JSON.stringify({
        username: String(formData.get("username") || "").trim()
      }),
      method: "POST"
    });
  }

  function registerAccount(form) {
    var formData = new FormData(form);

    return accountRequest("/api/auth/register", {
      body: JSON.stringify({
        email: String(formData.get("email") || "").trim(),
        firstName: String(formData.get("firstName") || "").trim(),
        lastName: String(formData.get("lastName") || "").trim(),
        password: String(formData.get("password") || ""),
        phone: String(formData.get("phone") || "").trim()
      }),
      method: "POST"
    });
  }

  function resetPasswordAccount(form) {
    var formData = new FormData(form);

    return accountRequest("/api/auth/reset-password", {
      body: JSON.stringify({
        login: String(formData.get("login") || ""),
        password: String(formData.get("password") || ""),
        token: String(formData.get("token") || "")
      }),
      method: "POST"
    });
  }

  function changePasswordAccount(form) {
    var formData = new FormData(form);

    return accountRequest("/api/account/change-password", {
      body: JSON.stringify({
        currentPassword: String(formData.get("currentPassword") || ""),
        newPassword: String(formData.get("newPassword") || "")
      }),
      method: "POST"
    });
  }

  function resendVerificationAccount(form) {
    var formData = new FormData(form);

    return accountRequest("/api/auth/resend-verification", {
      body: JSON.stringify({
        email: String(formData.get("email") || "").trim()
      }),
      method: "POST"
    });
  }

  function verifyEmailFromUrl() {
    var params = new URLSearchParams(window.location.search || "");
    var root = document.querySelector("[data-account-root]");

    accountRequest("/api/auth/verify-email", {
      body: JSON.stringify({
        login: params.get("verify_login") || "",
        token: params.get("verify_token") || ""
      }),
      method: "POST"
    }).then(function (payload) {
      if (root) root.innerHTML = renderVerifyEmailPanel(payload.message || "Email đã được xác nhận.");
    }).catch(function () {
      if (root) root.innerHTML = renderVerifyEmailPanel("Link xác nhận email không hợp lệ hoặc đã hết hạn.");
    });
  }

  function updateAccountAddress(form) {
    var formData = new FormData(form);
    var type = form.dataset.addressType === "billing" ? "billing" : "shipping";
    var address = {};

    for (var pair of formData.entries()) {
      address[pair[0]] = String(pair[1] || "").trim();
    }

    return accountRequest("/api/account/addresses", {
      body: JSON.stringify({ [type]: address }),
      method: "POST"
    });
  }

  function updateAccountProfile(form) {
    var formData = new FormData(form);

    return accountRequest("/api/account/profile", {
      body: JSON.stringify({
        email: String(formData.get("email") || "").trim(),
        firstName: String(formData.get("firstName") || "").trim(),
        lastName: String(formData.get("lastName") || "").trim()
      }),
      method: "POST"
    });
  }

  function fetchAccountOrder(orderId) {
    return accountRequest("/api/account/orders/" + encodeURIComponent(orderId), {
      method: "GET"
    });
  }

  function renderAccountOrderDetail(order) {
    var panel = document.querySelector("[data-account-order-panel]");
    if (!panel) return;

    if (!order || order.error) {
      panel.innerHTML = [
        '<div class="storefront-account-alert">' + escapeHtml(order?.error || "Chưa tải được chi tiết đơn hàng.") + '</div>'
      ].join("");
      return;
    }

    panel.innerHTML = [
      '<h2>Đơn hàng #' + escapeHtml(order.number || order.id || "") + '</h2>',
      '<div class="storefront-account-order-detail">',
      '<p><strong>Trạng thái:</strong> ' + escapeHtml(order.statusLabel || order.status || "") + '</p>',
      '<p><strong>Tổng tiền:</strong> ' + escapeHtml(formatCurrency(order.total || 0, order.currency || "VND")) + '</p>',
      '<p><strong>Thanh toán:</strong> ' + escapeHtml(order.paymentMethod || "") + '</p>',
      '<h3>Sản phẩm</h3>',
      '<div class="storefront-account-orders">',
      (order.items || []).map(function (item) {
        var productTitle = item.permalink
          ? '<a href="' + escapeHtml(item.permalink) + '">' + escapeHtml(item.name) + '</a>'
          : escapeHtml(item.name);

        return '<div class="storefront-account-order"><span><strong>' + productTitle + '</strong><small>Số lượng: ' + escapeHtml(item.quantity) + '</small></span><em>' + escapeHtml(formatCurrency(item.total || 0, order.currency || "VND")) + '</em></div>';
      }).join(""),
      '</div>',
      '</div>'
    ].join("");
  }

  function accountDisplayAddress(address) {
    if (!address) return "";

    return [
      address.address1 || address.address_1,
      address.address2 || address.address_2,
      address.city,
      address.state,
      address.postcode
    ].filter(Boolean).join(", ");
  }

  function accountDisplayName(address, user) {
    var name = [
      address && (address.firstName || address.first_name),
      address && (address.lastName || address.last_name)
    ].filter(Boolean).join(" ");

    return name || user?.displayName || user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  }

  function autofillCheckoutFromAccount() {
    var form = document.querySelector("[data-checkout-form]");
    var status = document.querySelector("[data-checkout-account-status]");
    if (!form) return;

    fetchAccountSession().then(function (session) {
      var user = session && session.user;
      var addresses = session && session.addresses;
      if (!user || !addresses) {
        if (status) status.innerHTML = '<a href="/account">Đăng nhập</a> để tự điền thông tin đặt hàng.';
        return;
      }

      var billing = addresses.billing || {};
      var shipping = addresses.shipping || {};
      var preferred = shipping.address1 || shipping.address_1 ? shipping : billing;
      var values = {
        address: accountDisplayAddress(preferred),
        company: preferred.company || billing.company || "",
        email: billing.email || user.email || "",
        name: accountDisplayName(preferred, user),
        phone: billing.phone || preferred.phone || ""
      };

      Object.keys(values).forEach(function (name) {
        var field = form.elements[name];
        if (field && !field.value && values[name]) {
          field.value = values[name];
        }
      });

      if (status) {
        status.textContent = "Đã tự điền thông tin từ tài khoản đang đăng nhập.";
        status.dataset.state = "success";
      }
    }).catch(function () {
      if (status) status.innerHTML = '<a href="/account">Đăng nhập</a> để tự điền thông tin đặt hàng.';
    });
  }

  function setAccountFormStatus(form, message) {
    setFormStatus(form, "[data-account-form-status]", message);
  }

  function setSubmitState(form, loadingLabel) {
    var button = form.querySelector('button[type="submit"]');
    var originalLabel = button ? button.textContent : "";

    form.dataset.loading = "true";
    if (button) {
      button.disabled = true;
      button.textContent = loadingLabel;
    }

    return function restoreSubmitState() {
      form.dataset.loading = "false";
      if (button) {
        button.disabled = false;
        button.textContent = originalLabel || button.textContent;
      }
    };
  }

  function logoutAccount() {
    accountSessionCache = null;
    accountSessionPromise = null;
    accountSessionRequestId += 1;

    return accountRequest("/api/auth/logout", {
      method: "POST"
    }).catch(function () {
      return null;
    });
  }

  function accountRequest(url, options) {
    return fetch(url, {
      body: options.body,
      credentials: "same-origin",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      method: options.method || "GET"
    }).then(function (response) {
      return response.status === 204 ? null : response.json().catch(function () { return {}; }).then(function (payload) {
        if (!response.ok) {
          var error = new Error(payload && (payload.error || payload.message) || "Account request failed.");
          error.status = response.status;
          error.payload = payload;
          throw error;
        }

        return payload;
      });
    });
  }

  function syncAccountLinks(user) {
    var label = user ? "Dashboard" : "Tài khoản";

    document.querySelectorAll("[data-account-link]").forEach(function (link) {
      link.textContent = label;
      link.setAttribute("href", "/account");
    });
  }

  function syncHeaderAccount() {
    if (!document.querySelector("[data-account-link]")) return;

    if (accountSessionCache?.user) {
      syncAccountLinks(accountSessionCache.user);
      return;
    }

    fetchAccountSession()
      .then(function (payload) {
        syncAccountLinks(payload && (payload.user || payload.customer || payload.account));
      })
      .catch(function () {
        syncAccountLinks(null);
      });
  }

  function accountViewFromPath() {
    var view = window.location.hash.replace(/^#/, "");

    if (["orders", "addresses", "profile"].includes(view)) {
      return view;
    }

    return "orders";
  }

  function accountAuthActionFromUrl() {
    var params = new URLSearchParams(window.location.search || "");
    if (params.get("reset_login") && params.get("reset_token")) return "reset";
    if (params.get("verify_login") && params.get("verify_token")) return "verify";
    return "";
  }

  function clearAccountAuthUrl() {
    if (window.location.pathname === "/account" && window.location.search) {
      history.replaceState(history.state, "", "/account");
    }
  }

  function setAccountView(view) {
    if (!["orders", "addresses", "profile"].includes(view)) return;

    history.replaceState(history.state, "", view === "orders" ? "/account" : "/account#" + view);

    renderAccountPage();
  }

  function accountOrderPageFromHash() {
    var match = window.location.hash.match(/orders-page-(\d+)/);

    return match ? Number(match[1]) : 1;
  }

  function setAccountOrdersPage(page) {
    history.replaceState(history.state, "", page > 1 ? "/account#orders-page-" + page : "/account");
    renderAccountPage();
  }

  function updateCartCount() {
    var count = readCart().reduce(function (total, item) {
      return total + cartItemQuantity(item);
    }, 0);

    document.querySelectorAll("[data-cart-count]").forEach(function (element) {
      element.textContent = String(count);
    });
  }

  function readRecentlyViewedProducts() {
    try {
      var parsed = JSON.parse(localStorage.getItem(recentlyViewedStorageKey) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeRecentlyViewedProducts(items) {
    localStorage.setItem(recentlyViewedStorageKey, JSON.stringify(items.slice(0, 12)));
  }

  function readCurrentViewedProduct() {
    var script = document.querySelector("[data-current-product-viewed]");
    if (!script) return null;

    try {
      var product = JSON.parse(script.textContent || "{}");
      return product && product.href && product.title ? product : null;
    } catch (error) {
      return null;
    }
  }

  function renderViewedProductCard(product) {
    var image = product.image
      ? '<div class="storefront-product-card__media"><img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.imageAlt || product.title) + '" loading="lazy"></div>'
      : '<div class="storefront-product-card__media storefront-product-card__media--empty">' + escapeHtml(product.title) + '</div>';
    var category = product.category ? '<span class="storefront-product-card__category">' + escapeHtml(product.category) + '</span>' : "";

    return [
      '<article class="storefront-product-card" data-product-card>',
      '<a class="storefront-product-card__link" href="' + escapeHtml(product.href) + '">',
      image,
      '<div class="storefront-product-card__body">',
      category,
      '<h3>' + escapeHtml(product.title) + '</h3>',
      '<strong>' + escapeHtml(product.price || "Liên hệ") + '</strong>',
      '</div>',
      '</a>',
      '</article>'
    ].join("");
  }

  function syncRecentlyViewedProducts() {
    var currentProduct = readCurrentViewedProduct();
    var section = document.querySelector("[data-recently-viewed-products]");
    var grid = document.querySelector("[data-recently-viewed-grid]");
    var viewed = readRecentlyViewedProducts();

    if (currentProduct) {
      viewed = [
        Object.assign({}, currentProduct, { viewedAt: Date.now() })
      ].concat(viewed.filter(function (product) {
        return String(product.href) !== String(currentProduct.href) && String(product.id) !== String(currentProduct.id);
      }));
      writeRecentlyViewedProducts(viewed);
    }

    if (!section || !grid) return;

    var visibleProducts = viewed.filter(function (product) {
      return !currentProduct || (String(product.href) !== String(currentProduct.href) && String(product.id) !== String(currentProduct.id));
    }).slice(0, 5);

    if (visibleProducts.length === 0) {
      section.hidden = true;
      grid.innerHTML = "";
      return;
    }

    grid.innerHTML = visibleProducts.map(renderViewedProductCard).join("");
    section.hidden = false;
  }

  function getProductSummary(element) {
    return element.closest && element.closest(".storefront-product-summary");
  }

  function readProductVariants(summary) {
    var script = summary && summary.querySelector("[data-product-variants]");
    if (!script) return [];

    try {
      return JSON.parse(script.textContent || "[]");
    } catch (error) {
      return [];
    }
  }

  function selectedVariantOptions(summary) {
    var selected = {};
    var groups = summary.querySelectorAll("[data-variant-attribute]");

    groups.forEach(function (group) {
      var active = group.querySelector("[data-variant-option][data-selected='true']");
      if (active) {
        selected[group.dataset.variantAttribute] = active.dataset.variantOption || "";
      }
    });

    return selected;
  }

  function findSelectedVariant(summary) {
    var selected = selectedVariantOptions(summary);
    var groups = summary.querySelectorAll("[data-variant-attribute]");
    var selectedCount = Object.keys(selected).length;

    if (!groups.length || selectedCount !== groups.length) {
      return null;
    }

    return readProductVariants(summary).find(function (variant) {
      return (variant.attributes || []).every(function (attribute) {
        return sameVariantValue(selected[attribute.key], attribute.option);
      });
    }) || null;
  }

  function variantMatchesSelection(variant, selected, ignoredKey) {
    return Object.keys(selected).every(function (key) {
      if (key === ignoredKey) return true;

      return (variant.attributes || []).some(function (attribute) {
        return attribute.key === key && sameVariantValue(attribute.option, selected[key]);
      });
    });
  }

  function variantHasOption(variant, key, option) {
    return (variant.attributes || []).some(function (attribute) {
      return attribute.key === key && sameVariantValue(attribute.option, option);
    });
  }

  function updateVariantOptionAvailability(summary) {
    var selected = selectedVariantOptions(summary);
    var variants = readProductVariants(summary);

    summary.querySelectorAll("[data-variant-attribute]").forEach(function (group) {
      var key = group.dataset.variantAttribute || "";

      group.querySelectorAll("[data-variant-option]").forEach(function (optionButton) {
        var option = optionButton.dataset.variantOption || "";
        var available = variants.some(function (variant) {
          return variantMatchesSelection(variant, selected, key) && variantHasOption(variant, key, option);
        });

        optionButton.disabled = !available;
        optionButton.dataset.available = available ? "true" : "false";

        if (!available && optionButton.dataset.selected === "true") {
          optionButton.dataset.selected = "false";
          optionButton.setAttribute("aria-pressed", "false");
        }
      });
    });
  }

  function productSelectionPayload(summary, variant) {
    var quantityInput = summary.querySelector(".storefront-product-actions input[type='number']");
    var action = summary.querySelector("[data-add-to-cart], [data-request-quote]");
    var quantity = Number(quantityInput && quantityInput.value) || 1;

    return {
      image: action ? action.dataset.productImage : "",
      productId: action ? action.dataset.productId : "",
      productTitle: action ? action.dataset.productTitle : "",
      productUrl: action ? action.dataset.productUrl : "",
      quantity: Math.max(1, quantity),
      variant: variant
    };
  }

  function updateVariantState(summary) {
    var variant = findSelectedVariant(summary);
    var selectedCount = Object.keys(selectedVariantOptions(summary)).length;
    var status = summary.querySelector("[data-variant-status]");
    var clear = summary.querySelector("[data-variant-clear]");
    var addButton = summary.querySelector("[data-add-to-cart]");
    var quoteLink = summary.querySelector("[data-request-quote]");
    var canSubmit = Boolean(variant);

    if (clear) {
      clear.hidden = selectedCount === 0;
    }

    if (status) {
      status.textContent = variant
        ? "Đã chọn: " + variant.attributes.map(function (attribute) { return attribute.option; }).join(" / ") + " - " + variant.priceLabel
        : "Chọn đủ tùy chọn để xem đúng giá và thêm vào báo giá.";
      status.dataset.state = variant ? "selected" : "pending";
    }

    if (addButton) {
      addButton.disabled = !canSubmit;
      addButton.dataset.variantId = variant ? variant.id : "";
    }

    if (quoteLink) {
      quoteLink.classList.toggle("is-disabled", !canSubmit);
      quoteLink.setAttribute("aria-disabled", canSubmit ? "false" : "true");
      quoteLink.dataset.variantId = variant ? variant.id : "";
    }

    summary.dataset.selectedVariantId = variant ? variant.id : "";
    return variant;
  }

  function chooseVariantOption(button) {
    var group = button.closest("[data-variant-attribute]");
    var summary = getProductSummary(button);
    if (!group || !summary) return;
    if (button.disabled) return;

    group.querySelectorAll("[data-variant-option]").forEach(function (option) {
      var selected = option === button;
      option.dataset.selected = selected ? "true" : "false";
      option.setAttribute("aria-pressed", selected ? "true" : "false");
    });

    syncQuantityFromVariantOption(summary, group, button);
    updateVariantOptionAvailability(summary);
    updateVariantState(summary);
  }

  function syncQuantityFromVariantOption(summary, group, button) {
    var attributeKey = group.dataset.variantAttribute || "";
    var label = group.querySelector("span");
    var labelText = label ? label.textContent : "";
    var isQuantity = isQuantityAttribute(attributeKey, labelText);

    if (!isQuantity) return;

    var quantityInput = summary.querySelector(".storefront-product-actions input[type='number']");
    var quantity = Number.parseInt(String(button.dataset.variantOption || "").replace(/[^\d]/g, ""), 10);

    if (quantityInput && Number.isFinite(quantity) && quantity > 0) {
      quantityInput.value = String(quantity);
      quantityInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function clearVariantSelection(button) {
    var summary = getProductSummary(button);
    if (!summary) return;

    summary.querySelectorAll("[data-variant-option]").forEach(function (option) {
      option.dataset.selected = "false";
      option.setAttribute("aria-pressed", "false");
    });

    var quantityInput = summary.querySelector(".storefront-product-actions input[type='number']");
    if (quantityInput) {
      quantityInput.value = "1";
      quantityInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    updateVariantOptionAvailability(summary);
    updateVariantState(summary);
  }

  function initProductVariants() {
    document.querySelectorAll(".storefront-product-summary").forEach(function (summary) {
      if (!summary.querySelector("[data-product-variants]")) return;

      updateVariantOptionAvailability(summary);
      updateVariantState(summary);
    });
  }

  function storeProductSelection(trigger) {
    var summary = getProductSummary(trigger);
    if (!summary) return null;

    var variant = updateVariantState(summary);
    var status = summary.querySelector("[data-variant-status]");

    if (!variant) {
      if (status) {
        status.textContent = "Bạn chọn đủ cấu hình trước rồi hãy thêm vào báo giá nhé.";
        status.dataset.state = "warning";
      }
      return null;
    }

    var payload = productSelectionPayload(summary, variant);
    localStorage.setItem("wpsc-product-selection", JSON.stringify(payload));
    return payload;
  }

  function addCartItem(payload) {
    var items = readCart();
    var key = cartItemKey(payload);
    var existing = items.find(function (item) {
      return cartItemKey(item) === key;
    });

    if (existing) {
      existing.quantity = cartItemQuantity(existing) + cartItemQuantity(payload);
    } else {
      items.push({
        image: payload.image || "",
        productId: payload.productId || "",
        productTitle: payload.productTitle || "",
        productUrl: payload.productUrl || "",
        quantity: cartItemQuantity(payload),
        variant: payload.variant || null
      });
    }

    writeCart(items);
    return items;
  }

  function addSelectionToCart(button) {
    var payload = storeProductSelection(button);
    var summary = getProductSummary(button);
    var status = summary && summary.querySelector("[data-variant-status]");

    if (!payload) {
      return false;
    }

    addCartItem(payload);

    if (status) {
      status.textContent = "Đã thêm vào giỏ hàng.";
      status.dataset.state = "selected";
    }

    button.textContent = "Đã thêm vào giỏ";
    window.setTimeout(function () {
      button.textContent = "Thêm vào giỏ";
    }, 1400);

    if (window.location.pathname === "/cart") {
      renderCartPage();
    }

    return true;
  }

  function removeCartItem(key) {
    writeCart(readCart().filter(function (item) {
      return cartItemKey(item) !== key;
    }));
    renderCartPage();
  }

  function updateCartItemQuantity(key, quantity) {
    var nextQuantity = Math.max(1, Number.parseInt(String(quantity || "1"), 10) || 1);
    var changed = false;
    var items = readCart().map(function (item) {
      if (cartItemKey(item) !== key) {
        return item;
      }

      changed = true;
      return Object.assign({}, item, { quantity: nextQuantity });
    });

    if (!changed) return;

    writeCart(items);
    renderCartPage();
  }

  function variantSummary(variant) {
    if (!variant || !Array.isArray(variant.attributes)) {
      return "";
    }

    return variant.attributes.map(function (attribute) {
      return escapeHtml(attribute.label || attribute.key) + ": " + escapeHtml(attribute.option);
    }).join(" / ");
  }

  function prepareCheckoutShell() {
    var shell = document.querySelector(mainSelector);
    var contentRoot = shell ? shell.querySelector(".storefront-content") : null;
    if (!shell || !contentRoot) return null;

    var pageBanner = shell.querySelector(".storefront-banner");
    var whyChooseUs = shell.querySelector(".storefront-why");
    if (pageBanner) pageBanner.remove();
    if (whyChooseUs) whyChooseUs.remove();

    return contentRoot;
  }

  function renderCheckoutSteps(activeStep) {
    return `
      <div class="storefront-checkout-steps-wrap">
        <nav class="storefront-checkout-steps" aria-label="Tiến trình đặt hàng">
          <a href="/cart"${activeStep === 1 ? ` class="is-current"` : ""}>
            <span class="storefront-checkout-step">1</span>
            Giỏ hàng
          </a>
          <span class="storefront-checkout-divider" aria-hidden="true">›</span>
          <a href="/checkout"${activeStep === 2 ? ` class="is-current"` : ""}>
            <span class="storefront-checkout-step">2</span>
            Thông tin đặt hàng
          </a>
          <span class="storefront-checkout-divider" aria-hidden="true">›</span>
          <a href="#" class="${activeStep === 3 ? "is-current" : "is-disabled"}" aria-disabled="${activeStep === 3 ? "false" : "true"}">
            <span class="storefront-checkout-step">3</span>
            Hoàn tất
          </a>
        </nav>
      </div>
    `;
  }

  function renderCartPage() {
    if (window.location.pathname !== "/cart") return;

    var contentRoot = prepareCheckoutShell();
    if (!contentRoot) return;

    var items = readCart();
    var total = cartTotal(items);
    var itemCount = items.length;
    var quantityTotal = cartQuantityTotal(items);
    var coupon = readCoupon();

    contentRoot.innerHTML = `
      <section class="storefront-cart-page">
        <div class="storefront-container">
          <header class="storefront-cart-heading">
            <div class="storefront-cart-heading__bg" aria-hidden="true"></div>
            <div class="storefront-cart-heading__content">
              <p class="storefront-kicker">Giỏ hàng</p>
              <h1>Giỏ hàng của bạn</h1>
            </div>
          </header>
          ${renderCheckoutSteps(1)}
        </div>
        <div class="storefront-container storefront-cart-page__content">
        ${items.length === 0 ? `
          <div class="storefront-cart-empty">
            <div class="storefront-cart-empty__icon">0</div>
            <h2>Giỏ hàng đang trống</h2>
            <p>Bạn chọn sản phẩm và cấu hình in trước, sau đó thêm vào giỏ hàng để gửi yêu cầu đặt hàng.</p>
            <a class="storefront-button" href="/">Tiếp tục mua hàng</a>
          </div>
        ` : `
          <div class="storefront-cart-layout">
            <section class="storefront-cart-panel" aria-label="Sản phẩm trong giỏ hàng">
              <div class="storefront-cart-table-head">
                <span>Sản phẩm</span>
                <span>Đơn giá</span>
                <span>Số lượng</span>
                <span>Tạm tính</span>
                <span></span>
              </div>
              ${items.map(function (item) {
                var price = item.variant ? Number(item.variant.price) : 0;
                var quantity = cartItemQuantity(item);
                var subtotal = Number.isFinite(price) ? price * quantity : 0;
                var key = escapeHtml(cartItemKey(item));

                return `
                  <article class="storefront-cart-item">
                    <div class="storefront-cart-product">
                      <a class="storefront-cart-item__image" href="${escapeHtml(item.productUrl || "/")}">
                        ${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.productTitle)}" loading="lazy">` : `<span>${escapeHtml(String(item.productTitle || "S").slice(0, 1))}</span>`}
                      </a>
                      <div class="storefront-cart-item__body">
                        <h2><a href="${escapeHtml(item.productUrl || "/")}">${escapeHtml(item.productTitle)}</a></h2>
                        <p>${variantSummary(item.variant)}</p>
                      </div>
                    </div>
                    <div class="storefront-cart-price" data-label="Đơn giá">${escapeHtml(formatCurrency(price, item.variant && item.variant.currency))}</div>
                    <div class="storefront-cart-quantity" data-label="Số lượng">
                      <input type="number" min="1" step="1" value="${escapeHtml(quantity)}" inputmode="numeric" data-cart-quantity="${key}" aria-label="Số lượng ${escapeHtml(item.productTitle)}">
                    </div>
                    <div class="storefront-cart-subtotal" data-label="Tạm tính">${escapeHtml(formatCurrency(subtotal, item.variant && item.variant.currency))}</div>
                    <button class="storefront-cart-remove" type="button" data-cart-remove="${key}" aria-label="Xóa sản phẩm">×</button>
                  </article>
                `;
              }).join("")}
            </section>
            <aside class="storefront-cart-summary">
              <h2>Tổng giỏ hàng</h2>
              <div class="storefront-cart-summary__line">
                <span>Sản phẩm</span>
                <strong>${escapeHtml(itemCount)}</strong>
              </div>
              <div class="storefront-cart-summary__line">
                <span>Tổng số lượng</span>
                <strong>${escapeHtml(quantityTotal)}</strong>
              </div>
              ${coupon ? `
                <div class="storefront-cart-summary__line storefront-checkout-coupon-value storefront-cart-coupon-value">
                  <span>Mã ưu đãi</span>
                  <strong>${escapeHtml(coupon)}</strong>
                  <button type="button" data-coupon-clear aria-label="Xóa mã ưu đãi">×</button>
                </div>
              ` : `
                <form class="storefront-cart-coupon storefront-cart-coupon--summary" action="/cart" method="get" data-coupon-form>
                  <label for="storefront-cart-coupon-code">Mã ưu đãi</label>
                  <div>
                    <input id="storefront-cart-coupon-code" type="text" name="coupon" placeholder="Nhập mã coupon">
                    <button type="submit">Áp dụng</button>
                  </div>
                </form>
              `}
              <div class="storefront-cart-summary__total">
                <span>Tạm tính</span>
                <strong>${escapeHtml(formatCurrency(total, "VND"))}</strong>
              </div>
              <div class="storefront-cart-actions">
                <a class="storefront-button" href="/checkout">Đặt hàng</a>
                <a class="storefront-button-secondary" href="/">Tiếp tục mua hàng</a>
              </div>
            </aside>
          </div>
        `}
        </div>
      </section>
    `;
  }

  function renderCheckoutPage() {
    if (window.location.pathname !== "/checkout") return;

    var contentRoot = prepareCheckoutShell();
    if (!contentRoot) return;

    var items = readCart();
    var total = cartTotal(items);
    var quantityTotal = cartQuantityTotal(items);
    var defaultShipment = 0;
    var coupon = readCoupon();

    contentRoot.innerHTML = `
      <section class="storefront-cart-page storefront-checkout-page">
        <div class="storefront-container">
          <header class="storefront-cart-heading">
            <div class="storefront-cart-heading__bg" aria-hidden="true"></div>
            <div class="storefront-cart-heading__content">
              <p class="storefront-kicker">Đặt hàng</p>
              <h1>Thông tin đặt hàng</h1>
            </div>
          </header>
          ${renderCheckoutSteps(2)}
        </div>
        <div class="storefront-container storefront-cart-page__content">
        ${items.length === 0 ? `
          <div class="storefront-cart-empty">
            <div class="storefront-cart-empty__icon">0</div>
            <h2>Chưa có sản phẩm để đặt hàng</h2>
            <p>Bạn cần chọn sản phẩm và thêm vào giỏ hàng trước khi gửi thông tin đặt hàng.</p>
            <a class="storefront-button" href="/">Tiếp tục mua hàng</a>
          </div>
        ` : `
          <div class="storefront-checkout-layout">
            <form id="wpsc-checkout-form" class="storefront-checkout-form" data-checkout-form>
              <section class="storefront-checkout-panel">
                <h2>Thông tin khách hàng</h2>
                <p class="storefront-checkout-account-status" data-checkout-account-status>Đang kiểm tra tài khoản đăng nhập...</p>
                <div class="storefront-checkout-fields">
                  <label>
                    <span>Họ và tên *</span>
                    <input type="text" name="name" autocomplete="name" required>
                  </label>
                  <label>
                    <span>Điện thoại *</span>
                    <input type="tel" name="phone" autocomplete="tel" required>
                  </label>
                  <label>
                    <span>Email</span>
                    <input type="email" name="email" autocomplete="email">
                  </label>
                  <label>
                    <span>Công ty</span>
                    <input type="text" name="company" autocomplete="organization">
                  </label>
                  <label class="storefront-checkout-field--wide">
                    <span>Địa chỉ giao hàng *</span>
                    <input type="text" name="address" autocomplete="street-address" required>
                  </label>
                  <label class="storefront-checkout-field--wide">
                    <span>Ghi chú đơn hàng / yêu cầu file in</span>
                    <textarea name="note" rows="5" placeholder="Ví dụ: giao giờ hành chính, cần tư vấn giấy, gửi file in qua email..."></textarea>
                  </label>
                </div>
              </section>
            </form>
            <aside class="storefront-cart-summary storefront-checkout-summary">
              <h2>Đơn hàng của bạn</h2>
              <div class="storefront-checkout-items">
                ${items.map(function (item) {
                  var price = item.variant ? Number(item.variant.price) : 0;
                  var quantity = cartItemQuantity(item);
                  var subtotal = Number.isFinite(price) ? price * quantity : 0;

                  return `
                    <article class="storefront-checkout-item">
                      <div>
                        <strong>${escapeHtml(item.productTitle)}</strong>
                        <small>${variantSummary(item.variant)}</small>
                        <span>Số lượng: ${escapeHtml(quantity)}</span>
                      </div>
                      <b>${escapeHtml(formatCurrency(subtotal, item.variant && item.variant.currency))}</b>
                    </article>
                  `;
                }).join("")}
              </div>
              <div class="storefront-cart-summary__line">
                <span>Tổng số lượng</span>
                <strong>${escapeHtml(quantityTotal)}</strong>
              </div>
              ${coupon ? `
                <div class="storefront-cart-summary__line storefront-checkout-coupon-value">
                  <span>Mã ưu đãi</span>
                  <strong>${escapeHtml(coupon)}</strong>
                </div>
              ` : `
                <form class="storefront-cart-coupon storefront-checkout-coupon-form" action="/checkout" method="get" data-coupon-form>
                  <label for="storefront-checkout-coupon-code">Mã ưu đãi</label>
                  <div>
                    <input id="storefront-checkout-coupon-code" type="text" name="coupon" placeholder="Nhập mã coupon">
                    <button type="submit">Áp dụng</button>
                  </div>
                </form>
              `}
              <div class="storefront-cart-summary__line">
                <span>Tạm tính sản phẩm</span>
                <strong data-checkout-subtotal>${escapeHtml(formatCurrency(total, "VND"))}</strong>
              </div>
              <section class="storefront-checkout-summary-section">
                <h3>Giao hàng</h3>
                <div class="storefront-checkout-methods">
                  <label>
                    <input type="radio" name="shipment" value="pickup" data-checkout-shipping data-shipping-fee="0" form="wpsc-checkout-form" checked>
                    <span>Miễn phí / nhận tại xưởng</span>
                  </label>
                  <label>
                    <input type="radio" name="shipment" value="local-delivery" data-checkout-shipping data-shipping-fee="30000" form="wpsc-checkout-form">
                    <span>Giao hàng nội thành - 30.000đ</span>
                  </label>
                </div>
              </section>
              <div class="storefront-cart-summary__total">
                <span>Tổng cộng</span>
                <strong data-checkout-total data-checkout-base-total="${escapeHtml(total)}">${escapeHtml(formatCurrency(total + defaultShipment, "VND"))}</strong>
              </div>
              <section class="storefront-checkout-summary-section">
                <h3>Hình thức thanh toán</h3>
                <div class="storefront-checkout-methods">
                  <label>
                    <input type="radio" name="payment" value="bank-transfer" form="wpsc-checkout-form" checked>
                    <span>Chuyển khoản ngân hàng</span>
                  </label>
                  <label>
                    <input type="radio" name="payment" value="quote-first" form="wpsc-checkout-form">
                    <span>Báo giá trước khi thanh toán</span>
                  </label>
                </div>
              </section>
              <label class="storefront-checkout-terms">
                <input type="checkbox" name="terms" form="wpsc-checkout-form" required>
                <span>Tôi đã đọc và đồng ý với <a href="/terms-conditions">điều khoản và điều kiện</a> của website.</span>
              </label>
              <p class="storefront-checkout-privacy">Dữ liệu cá nhân của bạn sẽ được sử dụng để xử lý đơn hàng, hỗ trợ trải nghiệm của bạn trên website này, và cho các mục đích khác được mô tả trong <a href="/chinh-sach-bao-mat">chính sách bảo mật</a> của chúng tôi.</p>
              <div class="storefront-cart-actions">
                <button class="storefront-button" type="submit" form="wpsc-checkout-form">Gửi đặt hàng</button>
                <a class="storefront-button-secondary" href="/cart">Quay lại giỏ hàng</a>
              </div>
              <p class="storefront-checkout-status" data-checkout-status></p>
              <p class="storefront-checkout-note">Sau khi gửi, Tín Sinh Phát sẽ kiểm tra cấu hình in và liên hệ xác nhận đơn hàng.</p>
            </aside>
          </div>
        `}
        </div>
      </section>
    `;

    autofillCheckoutFromAccount();
  }

  function readLastOrder() {
    try {
      var parsed = JSON.parse(localStorage.getItem("wpsc-last-order") || "null");
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function paymentLabel(value) {
    if (value === "bank-transfer") return "Chuyển khoản ngân hàng";
    if (value === "quote-first") return "Báo giá trước khi thanh toán";
    return value || "Chưa chọn";
  }

  function shipmentLabel(value) {
    if (value === "pickup") return "Miễn phí / nhận tại xưởng";
    if (value === "local-delivery") return "Giao hàng nội thành";
    return value || "Chưa chọn";
  }

  function bankQrUrl(order) {
    return createBankQrUrl(order, bankTransferConfig);
  }

  function renderBankTransferQr(order) {
    if (!order || order.payment !== "bank-transfer") {
      return "";
    }

    var memo = transferMemo(order);
    var amount = bankTransferAmount(order);

    return `
      <section class="storefront-thankyou-panel storefront-bank-transfer">
        <div class="storefront-bank-transfer__content">
          <div>
            <h2>Thanh toán chuyển khoản</h2>
            <p>Quét mã QR bằng ứng dụng ngân hàng để chuyển khoản thanh toán đơn hàng.</p>
            <dl class="storefront-bank-transfer__details">
              <div><dt>Ngân hàng</dt><dd>${escapeHtml(bankTransferConfig.bankName)}</dd></div>
              <div><dt>Số tài khoản</dt><dd>${escapeHtml(bankTransferConfig.accountNumber)}</dd></div>
              <div><dt>Chủ tài khoản</dt><dd>${escapeHtml(bankTransferConfig.accountName)}</dd></div>
              <div><dt>Số tiền</dt><dd>${escapeHtml(formatCurrency(amount, "VND"))}</dd></div>
              <div><dt>Nội dung</dt><dd>${escapeHtml(memo)}</dd></div>
            </dl>
            <button class="storefront-bank-transfer__copy" type="button" data-copy-text="${escapeHtml(memo)}">Copy nội dung chuyển khoản</button>
          </div>
          <div class="storefront-bank-transfer__qr">
            <img src="${escapeHtml(bankQrUrl(order))}" alt="QR chuyển khoản cho đơn ${escapeHtml(order.id || "")}" loading="lazy">
          </div>
        </div>
      </section>
    `;
  }

  function renderThankYouPage() {
    if (window.location.pathname !== "/thank-you") return;

    var contentRoot = prepareCheckoutShell();
    if (!contentRoot) return;

    var order = readLastOrder();

    contentRoot.innerHTML = `
      <section class="storefront-cart-page storefront-thankyou-page">
        <div class="storefront-container">
          <header class="storefront-cart-heading">
            <div class="storefront-cart-heading__bg" aria-hidden="true"></div>
            <div class="storefront-cart-heading__content">
              <p class="storefront-kicker">Hoàn tất</p>
              <h1>Cảm ơn bạn đã đặt hàng</h1>
            </div>
          </header>
          ${renderCheckoutSteps(3)}
        </div>
        <div class="storefront-container storefront-cart-page__content">
          ${!order ? `
            <div class="storefront-cart-empty">
              <div class="storefront-cart-empty__icon">!</div>
              <h2>Chưa tìm thấy thông tin đơn hàng</h2>
              <p>Bạn có thể quay lại giỏ hàng hoặc chọn sản phẩm để tạo đơn mới.</p>
              <a class="storefront-button" href="/">Tiếp tục mua hàng</a>
            </div>
          ` : `
            <div class="storefront-thankyou-layout">
              <section class="storefront-thankyou-panel storefront-thankyou-hero">
                <span class="storefront-thankyou-mark">✓</span>
                <div>
                  <p class="storefront-kicker">Đơn hàng đã được ghi nhận</p>
                  <h2>Mã đơn: ${escapeHtml(order.id || "TSP-TAM")}</h2>
                  <p>Tín Sinh Phát sẽ kiểm tra cấu hình in và liên hệ xác nhận với bạn trước khi sản xuất.</p>
                </div>
              </section>

              <section class="storefront-thankyou-panel">
                <h2>Thông tin đơn hàng</h2>
                <div class="storefront-thankyou-meta">
                  <div><span>Khách hàng</span><strong>${escapeHtml(order.customer && order.customer.name || "")}</strong></div>
                  <div><span>Điện thoại</span><strong>${escapeHtml(order.customer && order.customer.phone || "")}</strong></div>
                  <div><span>Email</span><strong>${escapeHtml(order.customer && order.customer.email || "Chưa có")}</strong></div>
                  <div><span>Địa chỉ</span><strong>${escapeHtml(order.customer && order.customer.address || "")}</strong></div>
                  <div><span>Thanh toán</span><strong>${escapeHtml(paymentLabel(order.payment))}</strong></div>
                  <div><span>Giao hàng</span><strong>${escapeHtml(shipmentLabel(order.shipment))}</strong></div>
                </div>
              </section>

              ${renderBankTransferQr(order)}

              <section class="storefront-thankyou-panel">
                <h2>Sản phẩm đã đặt</h2>
                <div class="storefront-checkout-items">
                  ${(order.items || []).map(function (item) {
                    var price = item.variant ? Number(item.variant.price) : 0;
                    var quantity = cartItemQuantity(item);
                    var subtotal = Number.isFinite(price) ? price * quantity : 0;

                    return `
                      <article class="storefront-checkout-item">
                        <div>
                          <strong>${escapeHtml(item.productTitle)}</strong>
                          <small>${variantSummary(item.variant)}</small>
                          <span>Số lượng: ${escapeHtml(quantity)}</span>
                        </div>
                        <b>${escapeHtml(formatCurrency(subtotal, item.variant && item.variant.currency))}</b>
                      </article>
                    `;
                  }).join("")}
                </div>
                <div class="storefront-thankyou-totals">
                  ${order.coupon ? `<div><span>Mã ưu đãi</span><strong>${escapeHtml(order.coupon)}</strong></div>` : ""}
                  <div><span>Tạm tính sản phẩm</span><strong>${escapeHtml(formatCurrency(order.subtotal, "VND"))}</strong></div>
                  <div><span>Phí giao hàng</span><strong>${escapeHtml(formatCurrency(order.shippingFee || 0, "VND"))}</strong></div>
                  <div class="is-total"><span>Tổng cộng</span><strong>${escapeHtml(formatCurrency(order.total, "VND"))}</strong></div>
                </div>
              </section>

              <section class="storefront-thankyou-panel">
                <h2>Bước tiếp theo</h2>
                <div class="storefront-thankyou-next">
                  <div><strong>1</strong><span>Chuẩn bị file in hoặc ghi chú yêu cầu chỉnh sửa.</span></div>
                  <div><strong>2</strong><span>Đội ngũ Tín Sinh Phát liên hệ xác nhận báo giá và thời gian giao hàng.</span></div>
                  <div><strong>3</strong><span>Sau khi xác nhận, đơn hàng sẽ được đưa vào quy trình sản xuất.</span></div>
                </div>
                <div class="storefront-cart-actions">
                  <a class="storefront-button" href="/">Tiếp tục mua hàng</a>
                  <a class="storefront-button-secondary" href="/track-order">Theo dõi đơn hàng</a>
                </div>
              </section>
            </div>
          `}
        </div>
      </section>
    `;
  }

  function orderMatchesLookup(order, lookup) {
    if (!order) return false;
    var code = String(lookup.code || "").trim().toLowerCase();
    var contact = String(lookup.contact || "").trim().toLowerCase();
    var orderId = String(order.id || order.number || "").trim().toLowerCase();
    var email = String(order.customer && order.customer.email || "").trim().toLowerCase();
    var phone = String(order.customer && order.customer.phone || "").replace(/\s+/g, "").toLowerCase();
    var normalizedContact = contact.replace(/\s+/g, "");

    return (!code || orderId === code) && (!contact || email === contact || phone === normalizedContact);
  }

  function renderTrackOrderResult(order, lookup) {
    if (!lookup || (!lookup.code && !lookup.contact)) {
      return "";
    }

    if (!orderMatchesLookup(order, lookup)) {
      return `
        <section class="storefront-thankyou-panel storefront-track-order-result">
          <h2>Chưa tìm thấy đơn hàng</h2>
          <p>Anh kiểm tra lại mã đơn và email/số điện thoại đã dùng khi đặt hàng. Với đơn hàng từ tài khoản Woo thật, phần tra cứu API sẽ được nối ở bước sau.</p>
          <a class="storefront-button-secondary" href="/account">Xem tài khoản</a>
        </section>
      `;
    }

    return `
      <section class="storefront-thankyou-panel storefront-track-order-result">
        <p class="storefront-kicker">Đã tìm thấy</p>
        <h2>Đơn hàng ${escapeHtml(order.id || "")}</h2>
        <div class="storefront-thankyou-meta">
          <div><span>Khách hàng</span><strong>${escapeHtml(order.customer && order.customer.name || "")}</strong></div>
          <div><span>Điện thoại</span><strong>${escapeHtml(order.customer && order.customer.phone || "")}</strong></div>
          <div><span>Email</span><strong>${escapeHtml(order.customer && order.customer.email || "Chưa có")}</strong></div>
          <div><span>Thanh toán</span><strong>${escapeHtml(paymentLabel(order.payment))}</strong></div>
          <div><span>Giao hàng</span><strong>${escapeHtml(shipmentLabel(order.shipment))}</strong></div>
          <div><span>Tổng cộng</span><strong>${escapeHtml(formatCurrency(order.total || 0, "VND"))}</strong></div>
        </div>
        <div class="storefront-cart-actions">
          <a class="storefront-button" href="/thank-you">Xem lại xác nhận</a>
          <a class="storefront-button-secondary" href="/">Tiếp tục mua hàng</a>
        </div>
      </section>
    `;
  }

  function readTrackOrderLookup() {
    var params = new URLSearchParams(window.location.search || "");
    return {
      code: params.get("order") || "",
      contact: params.get("contact") || ""
    };
  }

  function renderTrackOrderPage(options) {
    if (window.location.pathname !== "/track-order") return;

    var contentRoot = prepareCheckoutShell();
    if (!contentRoot) return;

    var lookup = readTrackOrderLookup();
    var order = options?.order || readLastOrder();
    var lookupError = options?.error || "";

    contentRoot.innerHTML = `
      <section class="storefront-cart-page storefront-track-order-page">
        <div class="storefront-container">
          <header class="storefront-cart-heading">
            <div class="storefront-cart-heading__bg" aria-hidden="true"></div>
            <div class="storefront-cart-heading__content">
              <p class="storefront-kicker">Tra cứu</p>
              <h1>Theo dõi đơn hàng</h1>
            </div>
          </header>
        </div>
        <div class="storefront-container storefront-cart-page__content">
          <div class="storefront-track-order-layout">
            <section class="storefront-checkout-panel">
              <h2>Nhập thông tin đơn hàng</h2>
              <p>Tra nhanh đơn vừa đặt trên trình duyệt này. Khi nối API thật, form này sẽ kiểm tra theo mã đơn và thông tin liên hệ trong WooCommerce.</p>
              <form class="storefront-account-form storefront-track-order-form" data-track-order-form>
                <label>
                  <span>Mã đơn hàng</span>
                  <input name="order" value="${escapeHtml(lookup.code)}" placeholder="Ví dụ: TSP-ABC123" required>
                </label>
                <label>
                  <span>Email hoặc số điện thoại</span>
                  <input name="contact" value="${escapeHtml(lookup.contact)}" placeholder="email@example.com hoặc số điện thoại" required>
                </label>
                <button class="storefront-button" type="submit">Tra cứu đơn hàng</button>
              </form>
            </section>
            <aside>
              ${lookupError ? `<section class="storefront-thankyou-panel storefront-track-order-result"><div class="storefront-account-alert">${escapeHtml(lookupError)}</div></section>` : ""}
              ${renderTrackOrderResult(order, lookup)}
              ${!lookup.code && !lookup.contact ? `
                <section class="storefront-thankyou-panel storefront-track-order-result">
                  <h2>Thông tin cần có</h2>
                  <p>Anh nhập mã đơn hàng cùng email hoặc số điện thoại đã dùng khi đặt hàng để kiểm tra nhanh.</p>
                  ${order ? `<p class="storefront-muted">Đơn gần nhất trên trình duyệt này: <strong>${escapeHtml(order.id || "")}</strong></p>` : ""}
                </section>
              ` : ""}
            </aside>
          </div>
        </div>
      </section>
    `;
  }

  async function handleCheckoutSubmit(form) {
    var status = document.querySelector("[data-checkout-status]");
    var restoreSubmit = setSubmitState(form, "Đang gửi...");
    var formData = new FormData(form);
    var shippingFee = Number(formData.get("shipmentFee") || 0);
    var selectedShipment = form.querySelector("[data-checkout-shipping]:checked");
    var selectedPayment = form.querySelector('input[name="payment"]:checked');
    if (selectedShipment) {
      shippingFee = Number(selectedShipment.dataset.shippingFee || 0);
    }
    var subtotal = cartTotal(readCart());
    var order = {
      createdAt: new Date().toISOString(),
      customer: {
        address: String(formData.get("address") || ""),
        company: String(formData.get("company") || ""),
        email: String(formData.get("email") || ""),
        name: String(formData.get("name") || ""),
        phone: String(formData.get("phone") || "")
      },
      items: readCart(),
      note: String(formData.get("note") || ""),
      payment: String(formData.get("payment") || "bank-transfer"),
      paymentLabel: selectedPayment ? selectedPayment.closest("label")?.textContent?.trim() || "" : "",
      shipment: String(formData.get("shipment") || "pickup"),
      shipmentLabel: selectedShipment ? selectedShipment.closest("label")?.textContent?.trim() || "" : "",
      shippingFee: Number.isFinite(shippingFee) ? shippingFee : 0,
      subtotal,
      total: subtotal + (Number.isFinite(shippingFee) ? shippingFee : 0)
    };

    order.coupon = readCoupon();
    order.id = "TSP-" + Date.now().toString(36).toUpperCase();

    if (status) {
      status.textContent = "Đang gửi đơn hàng...";
      status.dataset.state = "pending";
    }

    try {
      var response = await fetch("/api/checkout", {
        body: JSON.stringify(order),
        credentials: "same-origin",
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      });
      var payload = await response.json().catch(function () { return {}; });

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Checkout API failed.");
      }

      order.id = payload.number || payload.orderId || payload.id || order.id;
      order.remote = payload;
      order.status = payload.statusLabel || payload.status || "pending";
    } catch (error) {
      if (status) {
        status.textContent = "Chưa gửi được đơn hàng thật. Anh kiểm tra runtime/API rồi thử lại, giỏ hàng vẫn được giữ nguyên.";
        status.dataset.state = "error";
      }
      restoreSubmit();
      return;
    }

    localStorage.setItem("wpsc-last-order", JSON.stringify(order));
    writeCart([]);
    writeCoupon("");

    window.location.href = "/thank-you";
  }

  async function lookupTrackOrder(form) {
    var data = new FormData(form);
    var lookup = {
      code: String(data.get("order") || "").trim(),
      contact: String(data.get("contact") || "").trim()
    };
    var params = new URLSearchParams();
    params.set("order", lookup.code);
    params.set("contact", lookup.contact);
    window.history.replaceState(window.history.state, "", "/track-order?" + params.toString());

    try {
      var response = await fetch("/api/orders/lookup", {
        body: JSON.stringify({
          contact: lookup.contact,
          orderId: lookup.code
        }),
        credentials: "same-origin",
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      });
      var payload = await response.json().catch(function () { return {}; });

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Order not found.");
      }

      renderTrackOrderPage({
        order: {
          customer: {
            email: payload.billing?.email || "",
            name: [payload.billing?.firstName, payload.billing?.lastName].filter(Boolean).join(" "),
            phone: payload.billing?.phone || ""
          },
          id: payload.number || payload.id || lookup.code,
          payment: payload.paymentMethod || "",
          shipment: payload.shippingTotal > 0 ? "local-delivery" : "pickup",
          total: payload.total || 0
        }
      });
    } catch (error) {
      renderTrackOrderPage({
        error: "Chưa tra được đơn từ API thật, em đang kiểm tra đơn gần nhất trên trình duyệt này."
      });
    }
  }

  function updateCheckoutTotals() {
    var totalElement = document.querySelector("[data-checkout-total]");
    var selectedShipment = document.querySelector("[data-checkout-shipping]:checked");
    if (!totalElement) return;

    var baseTotal = Number(totalElement.dataset.checkoutBaseTotal || 0);
    var shippingFee = selectedShipment ? Number(selectedShipment.dataset.shippingFee || 0) : 0;
    totalElement.textContent = formatCurrency(baseTotal + (Number.isFinite(shippingFee) ? shippingFee : 0), "VND");
  }

  function applyCoupon(form) {
    var data = new FormData(form);
    writeCoupon(data.get("coupon"));

    if (window.location.pathname === "/checkout") {
      renderCheckoutPage();
    } else if (window.location.pathname === "/cart") {
      renderCartPage();
    }
  }

  function clearCoupon() {
    writeCoupon("");

    if (window.location.pathname === "/checkout") {
      renderCheckoutPage();
    } else if (window.location.pathname === "/cart") {
      renderCartPage();
    }
  }

  function shouldHandle(link) {
    if (!sameOriginLink(link)) return false;
    if (link.hasAttribute("data-no-enhanced-navigation")) return false;
    if (link.pathname.startsWith("/admin")) return false;
    if (link.pathname.startsWith("/api")) return false;
    if (link.pathname.startsWith("/cart") || link.pathname.startsWith("/checkout") || link.pathname.startsWith("/thank-you") || link.pathname.startsWith("/track-order")) return false;
    return true;
  }

  function rememberRoutePrefetch(pathname, promise) {
    routePrefetchCache.set(pathname, promise);

    if (routePrefetchCache.size > routePrefetchLimit) {
      routePrefetchCache.delete(routePrefetchCache.keys().next().value);
    }
  }

  async function loadRouteFragment(pathname) {
    pathname = normalizeNavigationPath(pathname);

    if (routePrefetchCache.has(pathname)) {
      return routePrefetchCache.get(pathname);
    }

    var promise = fetch(routeDataUrl(pathname), { headers: { accept: "application/json" } })
      .then(function (dataResponse) {
        if (!dataResponse.ok) throw new Error("Route data not found");
        return dataResponse.json();
      })
      .then(function (data) {
        var fragmentUrl = data.runtime && data.runtime.fragmentUrl;
        if (!fragmentUrl) throw new Error("Route fragment missing");

        return fetch(fragmentUrl, { headers: { accept: "text/html" } })
          .then(function (fragmentResponse) {
            if (!fragmentResponse.ok) throw new Error("Route fragment not found");
            return fragmentResponse.text();
          })
          .then(function (fragment) {
            return { data: data, fragment: fragment };
          });
      })
      .catch(function (error) {
        routePrefetchCache.delete(pathname);
        throw error;
      });

    rememberRoutePrefetch(pathname, promise);
    return promise;
  }

  function prefetchRoute(pathname) {
    pathname = normalizeNavigationPath(pathname);
    if (routePrefetchCache.has(pathname) || pathname === normalizeNavigationPath(window.location.pathname)) return;
    loadRouteFragment(pathname).catch(function () {});
  }

  function markContentEntered() {
    var content = document.querySelector(".storefront-content");
    if (!content || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    content.classList.remove("storefront-content--enter");
    window.requestAnimationFrame(function () {
      content.classList.add("storefront-content--enter");
      window.setTimeout(function () {
        content.classList.remove("storefront-content--enter");
      }, transitionMs);
    });
  }

  async function navigate(pathname, options) {
    pathname = normalizeNavigationPath(pathname);
    var payload = await loadRouteFragment(pathname);
    var data = payload.data;
    var fragment = payload.fragment;
    var currentMain = document.querySelector(mainSelector);
    if (!currentMain) throw new Error("Main element missing");

    currentMain.outerHTML = fragment;
    markContentEntered();
    if (data.seo && data.seo.title) {
      document.title = data.seo.title;
    } else if (data.content && data.content.title) {
      document.title = data.content.title;
    }

    if (!options || options.push !== false) {
      window.history.pushState({ wpsc: true, path: pathname }, "", pathname);
    }

    window.dispatchEvent(new CustomEvent("wpsc:navigation", { detail: data }));
    window.scrollTo(0, 0);
  }

  document.addEventListener("pointerover", function (event) {
    var link = event.target.closest && event.target.closest("a[href]");
    if (!link || !shouldHandle(link)) return;
    prefetchRoute(link.pathname);
  });

  document.addEventListener("focusin", function (event) {
    var link = event.target.closest && event.target.closest("a[href]");
    if (!link || !shouldHandle(link)) return;
    prefetchRoute(link.pathname);
  });

  document.addEventListener("touchstart", function (event) {
    var link = event.target.closest && event.target.closest("a[href]");
    if (!link || !shouldHandle(link)) return;
    prefetchRoute(link.pathname);
  }, { passive: true });

  document.addEventListener("click", function (event) {
    var themeButton = event.target.closest && event.target.closest("[data-storefront-theme-toggle]");

    if (themeButton) {
      event.preventDefault();
      setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
      return;
    }

    var variantOption = event.target.closest && event.target.closest("[data-variant-option]");

    if (variantOption) {
      event.preventDefault();
      chooseVariantOption(variantOption);
      return;
    }

    var galleryThumb = event.target.closest && event.target.closest("[data-product-gallery-thumb]");

    if (galleryThumb) {
      event.preventDefault();
      switchProductGalleryImage(galleryThumb);
      return;
    }

    var galleryOpen = event.target.closest && event.target.closest("[data-product-gallery-open]");

    if (galleryOpen) {
      event.preventDefault();
      openProductGalleryLightbox(galleryOpen);
      return;
    }

    var galleryLightboxClose = event.target.closest && event.target.closest("[data-product-gallery-lightbox-close]");
    var galleryLightboxBackdrop = event.target.matches && event.target.matches("[data-product-gallery-lightbox]");

    if (galleryLightboxClose || galleryLightboxBackdrop) {
      event.preventDefault();
      closeProductGalleryLightbox();
      return;
    }

    var variantClear = event.target.closest && event.target.closest("[data-variant-clear]");

    if (variantClear) {
      event.preventDefault();
      clearVariantSelection(variantClear);
      return;
    }

    var addToCart = event.target.closest && event.target.closest("[data-add-to-cart]");

    if (addToCart) {
      event.preventDefault();
      addSelectionToCart(addToCart);
      return;
    }

    var cartRemove = event.target.closest && event.target.closest("[data-cart-remove]");

    if (cartRemove) {
      event.preventDefault();
      removeCartItem(cartRemove.dataset.cartRemove);
      return;
    }

    var couponClear = event.target.closest && event.target.closest("[data-coupon-clear]");

    if (couponClear) {
      event.preventDefault();
      clearCoupon();
      return;
    }

    var copyButton = event.target.closest && event.target.closest("[data-copy-text]");

    if (copyButton) {
      event.preventDefault();
      var copyText = copyButton.dataset.copyText || "";
      if (navigator.clipboard && copyText) {
        navigator.clipboard.writeText(copyText).then(function () {
          copyButton.textContent = "Đã copy";
          window.setTimeout(function () {
            copyButton.textContent = "Copy nội dung chuyển khoản";
          }, 1400);
        });
      }
      return;
    }

    var quoteRequest = event.target.closest && event.target.closest("[data-request-quote]");

    if (quoteRequest) {
      var quotePayload = storeProductSelection(quoteRequest);
      if (!quotePayload) {
        event.preventDefault();
        return;
      }
    }

    var productTab = event.target.closest && event.target.closest("[data-product-tab]");

    if (productTab) {
      event.preventDefault();
      switchProductTab(productTab);
      return;
    }

    var descriptionToggle = event.target.closest && event.target.closest("[data-description-toggle]");

    if (descriptionToggle) {
      event.preventDefault();
      toggleDescription(descriptionToggle);
      return;
    }

    var searchPageSubmit = event.target.closest && event.target.closest("[data-search-page-submit]");

    if (searchPageSubmit) {
      var explicitSearchForm = searchPageSubmit.closest("[data-search-page-form]");
      if (explicitSearchForm) {
        event.preventDefault();
        submitSearchForm(explicitSearchForm);
        return;
      }
    }

    var accountLogout = event.target.closest && event.target.closest("[data-account-logout]");

    if (accountLogout) {
      event.preventDefault();
      logoutAccount().then(function () {
        syncAccountLinks(null);
        renderAccountPage();
      });
      return;
    }

    var accountView = event.target.closest && event.target.closest("[data-account-view]");

    if (accountView) {
      event.preventDefault();
      setAccountView(accountView.dataset.accountView || "overview");
      return;
    }

    var accountOrdersPage = event.target.closest && event.target.closest("[data-account-orders-page]");

    if (accountOrdersPage) {
      event.preventDefault();
      setAccountOrdersPage(Number(accountOrdersPage.dataset.accountOrdersPage) || 1);
      return;
    }

    var accountLostPassword = event.target.closest && event.target.closest("[data-account-lost-password]");

    if (accountLostPassword) {
      event.preventDefault();
      var root = document.querySelector("[data-account-root]");
      if (root) {
        root.innerHTML = renderLostPasswordForm();
      }
      return;
    }

    var accountRegister = event.target.closest && event.target.closest("[data-account-register]");

    if (accountRegister) {
      event.preventDefault();
      var registerRoot = document.querySelector("[data-account-root]");
      if (registerRoot) {
        registerRoot.innerHTML = renderRegisterForm();
      }
      return;
    }

    var accountShowLogin = event.target.closest && event.target.closest("[data-account-show-login]");

    if (accountShowLogin) {
      event.preventDefault();
      clearAccountAuthUrl();
      var loginRoot = document.querySelector("[data-account-root]");
      if (loginRoot) {
        loginRoot.innerHTML = renderAccountLogin();
      }
      return;
    }

    var accountOrder = event.target.closest && event.target.closest("[data-account-order-id]");

    if (accountOrder) {
      event.preventDefault();
      var panel = document.querySelector("[data-account-order-panel]");
      document.querySelectorAll("[data-account-order-id]").forEach(function (orderLink) {
        orderLink.classList.toggle("is-active", orderLink === accountOrder);
        if (orderLink === accountOrder) {
          orderLink.setAttribute("aria-current", "true");
        } else {
          orderLink.removeAttribute("aria-current");
        }
      });
      if (panel) {
        panel.innerHTML = '<p class="storefront-muted">Đang tải chi tiết đơn hàng...</p>';
      }
      fetchAccountOrder(accountOrder.dataset.accountOrderId)
        .then(renderAccountOrderDetail)
        .catch(function () {
          if (panel) {
            panel.innerHTML = '<div class="storefront-account-alert">Chưa tải được chi tiết đơn hàng.</div>';
          }
        });
      return;
    }

    var searchResultCard = event.target.closest && event.target.closest("[data-search-result-card]");

    if (searchResultCard) {
      var searchResultHref = searchResultCard.dataset.searchResultHref;
      if (searchResultHref) {
        event.preventDefault();
        window.location.href = searchResultHref;
        return;
      }
    }

    var searchFilter = event.target.closest && event.target.closest("[data-search-filter]");

    if (searchFilter) {
      event.preventDefault();
      var searchRoot = searchFilter.closest("[data-search-page]");
      if (searchRoot) {
        searchRoot.dataset.searchFilter = searchFilter.dataset.searchFilter || "all";
        renderSearchPage();
      }
      return;
    }

    var link = event.target.closest && event.target.closest("a[href]");
    if (!link || !shouldHandle(link)) return;

    event.preventDefault();
    navigate(link.pathname).catch(function () {
      window.location.href = link.href;
    });
  });

  document.addEventListener("change", function (event) {
    var cartQuantity = event.target.closest && event.target.closest("[data-cart-quantity]");

    if (cartQuantity) {
      updateCartItemQuantity(cartQuantity.dataset.cartQuantity, cartQuantity.value);
      return;
    }

    var checkoutShipping = event.target.closest && event.target.closest("[data-checkout-shipping]");

    if (checkoutShipping) {
      updateCheckoutTotals();
      return;
    }

    var sortSelect = event.target.closest && event.target.closest("[data-storefront-sort]");

    if (sortSelect) {
      sortProductGrid(sortSelect);
    }
  });

  document.addEventListener("submit", function (event) {
    var accountLoginForm = event.target.closest && event.target.closest("[data-account-login-form]");

    if (accountLoginForm) {
      event.preventDefault();
      accountLoginForm.dataset.loading = "true";
      var submitButton = accountLoginForm.querySelector('button[type="submit"]');
      var originalLabel = submitButton ? submitButton.textContent : "";

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Đang đăng nhập...";
      }

      loginAccount(accountLoginForm)
        .then(function (payload) {
          var user = payload && (payload.user || payload.customer || payload.account);
          accountSessionCache = user ? normalizeAccountSession(payload, user) : null;
          accountSessionPromise = null;
          syncAccountLinks(user);
          return fetchAccountSession({ force: true }).catch(function () {
            return accountSessionCache;
          });
        })
        .then(function () {
          clearAccountAuthUrl();
          renderAccountPage();
        })
        .catch(function (error) {
          var message = error && error.status === 401
            ? "Thông tin đăng nhập chưa đúng. Anh kiểm tra lại email/tên đăng nhập và mật khẩu."
            : "Chưa đăng nhập được vì API /api/auth/login chưa sẵn sàng hoặc chưa kết nối được.";

          var root = document.querySelector("[data-account-root]");
          if (root) {
            root.innerHTML = renderAccountLogin({ message: message });
          }
        })
        .finally(function () {
          accountLoginForm.dataset.loading = "false";
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalLabel || "Đăng nhập";
          }
        });
      return;
    }

    var passwordResetForm = event.target.closest && event.target.closest("[data-account-password-reset-form]");

    if (passwordResetForm) {
      event.preventDefault();
      var restorePasswordReset = setSubmitState(passwordResetForm, "Đang gửi...");
      setAccountFormStatus(passwordResetForm, "Đang gửi hướng dẫn đặt lại mật khẩu...");
      passwordResetAccount(passwordResetForm)
        .then(function (payload) {
          var root = document.querySelector("[data-account-root]");
          if (root) root.innerHTML = renderLostPasswordForm(payload.message || "Nếu tài khoản tồn tại, email đặt lại mật khẩu đã được gửi.");
        })
        .catch(function () {
          var root = document.querySelector("[data-account-root]");
          if (root) root.innerHTML = renderLostPasswordForm("Chưa gửi được yêu cầu đặt lại mật khẩu.");
        })
        .finally(function () {
          restorePasswordReset();
        });
      return;
    }

    var registerForm = event.target.closest && event.target.closest("[data-account-register-form]");

    if (registerForm) {
      event.preventDefault();
      var restoreRegister = setSubmitState(registerForm, "Đang đăng ký...");
      setAccountFormStatus(registerForm, "Đang tạo tài khoản và gửi email xác nhận...");
      registerAccount(registerForm)
        .then(function (payload) {
          var root = document.querySelector("[data-account-root]");
          if (root) root.innerHTML = renderAccountLogin({ message: payload.message || "Tài khoản đã được tạo. Anh kiểm tra email để xác nhận tài khoản." });
        })
        .catch(function (error) {
          var root = document.querySelector("[data-account-root]");
          var message = error && error.message ? error.message : "Chưa tạo được tài khoản.";
          if (root) root.innerHTML = renderRegisterForm(message);
        })
        .finally(function () {
          restoreRegister();
        });
      return;
    }

    var resetPasswordForm = event.target.closest && event.target.closest("[data-account-reset-password-form]");

    if (resetPasswordForm) {
      event.preventDefault();
      var restoreResetPassword = setSubmitState(resetPasswordForm, "Đang đặt lại...");
      setAccountFormStatus(resetPasswordForm, "Đang đặt lại mật khẩu...");
      resetPasswordAccount(resetPasswordForm)
        .then(function (payload) {
          var root = document.querySelector("[data-account-root]");
          if (root) root.innerHTML = renderAccountLogin({ message: payload.message || "Mật khẩu đã được đặt lại. Anh đăng nhập lại nhé." });
        })
        .catch(function () {
          var root = document.querySelector("[data-account-root]");
          if (root) root.innerHTML = renderResetPasswordForm("Chưa đặt lại được mật khẩu. Link có thể đã hết hạn.");
        })
        .finally(function () {
          restoreResetPassword();
        });
      return;
    }

    var addressForm = event.target.closest && event.target.closest("[data-account-address-form]");

    if (addressForm) {
      event.preventDefault();
      var restoreAddress = setSubmitState(addressForm, "Đang lưu...");
      setAccountFormStatus(addressForm, "Đang lưu địa chỉ...");
      updateAccountAddress(addressForm).then(function () {
        setAccountFormStatus(addressForm, "Đã lưu địa chỉ.");
        accountSessionCache = null;
        return fetchAccountSession({ force: true });
      }).then(function () {
        window.setTimeout(function () {
          renderAccountPage();
        }, 550);
      }).catch(function () {
        setAccountFormStatus(addressForm, "Chưa lưu được địa chỉ.");
      }).finally(function () {
        restoreAddress();
      });
      return;
    }

    var profileForm = event.target.closest && event.target.closest("[data-account-profile-form]");

    if (profileForm) {
      event.preventDefault();
      var restoreProfile = setSubmitState(profileForm, "Đang cập nhật...");
      setAccountFormStatus(profileForm, "Đang cập nhật thông tin...");
      updateAccountProfile(profileForm).then(function () {
        setAccountFormStatus(profileForm, "Đã cập nhật thông tin.");
        accountSessionCache = null;
        return fetchAccountSession({ force: true });
      }).then(function () {
        syncHeaderAccount();
        window.setTimeout(function () {
          renderAccountPage();
        }, 550);
      }).catch(function () {
        setAccountFormStatus(profileForm, "Chưa cập nhật được thông tin.");
      }).finally(function () {
        restoreProfile();
      });
      return;
    }

    var changePasswordForm = event.target.closest && event.target.closest("[data-account-change-password-form]");

    if (changePasswordForm) {
      event.preventDefault();
      var restoreChangePassword = setSubmitState(changePasswordForm, "Đang đổi...");
      setAccountFormStatus(changePasswordForm, "Đang đổi mật khẩu...");
      changePasswordAccount(changePasswordForm).then(function (payload) {
        setAccountFormStatus(changePasswordForm, payload.message || "Đã đổi mật khẩu. Anh đăng nhập lại nhé.");
        accountSessionCache = null;
        accountSessionPromise = null;
        syncAccountLinks(null);
        window.setTimeout(renderAccountPage, 700);
      }).catch(function () {
        setAccountFormStatus(changePasswordForm, "Chưa đổi được mật khẩu.");
      }).finally(function () {
        restoreChangePassword();
      });
      return;
    }

    var resendVerificationForm = event.target.closest && event.target.closest("[data-account-resend-verification-form]");

    if (resendVerificationForm) {
      event.preventDefault();
      var restoreResendVerification = setSubmitState(resendVerificationForm, "Đang gửi...");
      setAccountFormStatus(resendVerificationForm, "Đang gửi email xác nhận...");
      resendVerificationAccount(resendVerificationForm).then(function (payload) {
        setAccountFormStatus(resendVerificationForm, payload.message || "Nếu tài khoản cần xác nhận, email đã được gửi lại.");
      }).catch(function () {
        setAccountFormStatus(resendVerificationForm, "Chưa gửi lại được email xác nhận.");
      }).finally(function () {
        restoreResendVerification();
      });
      return;
    }

    var searchForm = event.target.closest && event.target.closest(".storefront-search, [data-storefront-search-form], [data-search-page-form]");

    if (searchForm) {
      event.preventDefault();
      submitSearchForm(searchForm);
      return;
    }

    var couponForm = event.target.closest && event.target.closest("[data-coupon-form]");

    if (couponForm) {
      event.preventDefault();
      applyCoupon(couponForm);
      return;
    }

    var trackOrderForm = event.target.closest && event.target.closest("[data-track-order-form]");

    if (trackOrderForm) {
      event.preventDefault();
      lookupTrackOrder(trackOrderForm);
      return;
    }

    var checkoutForm = event.target.closest && event.target.closest("[data-checkout-form]");

    if (checkoutForm) {
      event.preventDefault();
      handleCheckoutSubmit(checkoutForm);
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeProductGalleryLightbox();
      return;
    }

    if (event.key === "Enter") {
      var searchResultCard = event.target.closest && event.target.closest("[data-search-result-card]");
      if (searchResultCard && searchResultCard.dataset.searchResultHref) {
        event.preventDefault();
        window.location.href = searchResultCard.dataset.searchResultHref;
        return;
      }

      var searchInput = event.target.closest && event.target.closest("[data-search-page-input]");
      var searchForm = searchInput && searchInput.closest("[data-search-page-form]");

      if (searchForm) {
        event.preventDefault();
        submitSearchForm(searchForm);
        return;
      }
    }
  });

  window.addEventListener("popstate", function () {
    navigate(window.location.pathname, { push: false }).catch(function () {
      window.location.reload();
    });
  });

  window.addEventListener("wpsc:navigation", syncThemeToggle);
  window.addEventListener("wpsc:navigation", renderCartPage);
  window.addEventListener("wpsc:navigation", renderCheckoutPage);
  window.addEventListener("wpsc:navigation", renderThankYouPage);
  window.addEventListener("wpsc:navigation", renderTrackOrderPage);
  window.addEventListener("wpsc:navigation", updateCartCount);
  window.addEventListener("wpsc:navigation", syncRecentlyViewedProducts);
  window.addEventListener("wpsc:navigation", initProductVariants);
  window.addEventListener("wpsc:navigation", renderSearchPage);
  window.addEventListener("wpsc:navigation", syncHeaderAccount);
  window.addEventListener("wpsc:navigation", renderAccountPage);
  syncThemeToggle();
  updateCartCount();
  syncRecentlyViewedProducts();
  initProductVariants();
  renderSearchPage();
  syncHeaderAccount();
  renderAccountPage();
  renderCartPage();
  renderCheckoutPage();
  renderThankYouPage();
  renderTrackOrderPage();
}());
