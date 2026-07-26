const blocks = [
  {
    blockName: "layout/row",
    label: "Row",
    props: {
      columns: 2,
      gap: "16px"
    }
  },
  {
    blockName: "core/heading",
    label: "Heading",
    props: {
      level: 2,
      text: "Tiêu đề mới"
    }
  },
  {
    blockName: "core/content-text",
    label: "Content Text",
    props: {
      field: "content",
      fallback: "Nội dung mô tả"
    }
  },
  {
    blockName: "site/logo",
    label: "Site Logo",
    props: {
      href: "/",
      text: "Tin Sinh Phát"
    }
  },
  {
    blockName: "site/nav",
    label: "Site Navigation",
    props: {
      ariaLabel: "Primary",
      items: [{
        href: "/",
        label: "Trang chủ"
      }, {
        href: "/lien-he",
        label: "Liên hệ"
      }]
    }
  },
  {
    blockName: "site/dark-mode-toggle",
    label: "Dark Mode Toggle",
    props: {
      label: "Đổi giao diện sáng tối"
    }
  },
  {
    blockName: "site/header",
    label: "Site Header",
    props: {
      logoHref: "/",
      logoText: "Tin Sinh Phát",
      navItems: [{
        href: "/",
        label: "Trang chủ"
      }, {
        href: "/shop",
        label: "Sản phẩm"
      }, {
        href: "/lien-he",
        label: "Liên hệ"
      }],
      rows: [],
      showDarkMode: true
    }
  },
  {
    blockName: "commerce/product-price",
    label: "Product Price",
    props: {
      currency: "VND"
    }
  },
  {
    blockName: "commerce/archive-links",
    label: "Archive Links",
    props: {
      label: "Danh mục"
    }
  }
];

const DRAFT_PREFIX = "wpsc_builder_route_draft:";
const STYLE_SETTINGS = [
  ["className", "Class"],
  ["width", "Width"],
  ["maxWidth", "Max width"],
  ["height", "Height"],
  ["background", "Màu nền"],
  ["color", "Màu chữ"],
  ["padding", "Padding"],
  ["margin", "Margin"]
];

const state = {
  layout: {
    contentTypes: ["page"],
    id: "builder-page",
    name: "Default Page",
    sections: [{
      children: [],
      id: "main",
      settings: {
        width: "content"
      },
      type: "section"
    }],
    version: 1
  },
  route: {
    data: null,
    draftKey: null,
    error: null,
    fragmentHtml: "",
    loading: true
  },
  draft: {
    restored: false,
    savedAt: null
  },
  selectedId: null
};

const root = document.querySelector("[data-builder-root]");
const palette = root.querySelector("[data-block-palette]");
const canvas = root.querySelector("[data-canvas]");
const propsPanel = root.querySelector("[data-props-panel]");
const preview = root.querySelector("[data-preview]");
const layoutName = root.querySelector("[data-layout-name]");
const draftStatus = root.querySelector("[data-draft-status]");
const routeTitle = root.querySelector("[data-route-title]");
const routePath = root.querySelector("[data-route-path]");
const routeMeta = root.querySelector("[data-route-meta]");

await loadRouteContext();
render();

root.addEventListener("click", (event) => {
  const panelButton = event.target.closest("[data-panel-button]");
  const nodeButton = event.target.closest("[data-node-id]");
  const actionButton = event.target.closest("[data-action]");
  const headerActionButton = event.target.closest("[data-header-action]");

  if (panelButton) {
    selectPanel(panelButton.dataset.panelButton);
    return;
  }

  if (actionButton) {
    updateNodeOrder(actionButton.dataset.nodeId, actionButton.dataset.action);
    return;
  }

  if (headerActionButton) {
    updateHeaderLayout(headerActionButton);
    return;
  }

  if (nodeButton) {
    state.selectedId = nodeButton.dataset.nodeId;
    render();
  }
});

root.addEventListener("dragstart", (event) => {
  const blockCard = event.target.closest("[data-add-block]");

  if (!blockCard || !event.dataTransfer) {
    return;
  }

  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData("text/plain", blockCard.dataset.addBlock);
});

window.addEventListener("message", (event) => {
  const message = event.data;

  if (!message || typeof message !== "object") {
    return;
  }

  if (message.type === "wpsc-builder-drop") {
    if (message.nodeId) {
      moveNode(message.nodeId, {
        columnId: message.columnId,
        position: message.position,
        targetNodeId: message.targetNodeId
      });
    } else {
      addBlock(message.blockIndex, {
        columnId: message.columnId,
        position: message.position,
        targetNodeId: message.targetNodeId
      });
    }
  }

  if (message.type === "wpsc-builder-select") {
    state.selectedId = message.nodeId;
    selectPanel("props");
    render();
  }

  if (message.type === "wpsc-builder-remove") {
    if (removeNode(message.nodeId)) {
      markDraftDirty();
      render();
    }
  }
});

root.querySelector("[data-save-layout]").addEventListener("click", () => {
  saveDraft();
});

root.querySelector("[data-export-layout]").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state.layout, null, 2)], {
    type: "application/json"
  });
  const link = document.createElement("a");
  link.download = `${state.layout.id}.json`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
});

root.querySelector("[data-reset-layout]").addEventListener("click", () => {
  if (!state.route.draftKey) {
    return;
  }

  localStorage.removeItem(state.route.draftKey);
  state.layout = createDefaultLayout(state.route.data);
  state.draft = {
    restored: false,
    savedAt: null
  };
  state.selectedId = null;
  render();
});

root.querySelector("[data-apply-header-demo]").addEventListener("click", () => {
  applyHeaderDemo();
});

root.querySelector("[data-build-route-preview]").addEventListener("click", () => {
  openBuiltRoutePreview();
});

document.addEventListener("keydown", (event) => {
  if ((event.key !== "Delete" && event.key !== "Backspace") || isEditingText(event.target)) {
    return;
  }

  if (state.selectedId && removeNode(state.selectedId)) {
    event.preventDefault();
    markDraftDirty();
    render();
  }
});

propsPanel.addEventListener("input", (event) => {
  const input = event.target.closest("[data-prop-name]");
  const settingInput = event.target.closest("[data-setting-name]");

  if (!input && !settingInput) {
    return;
  }

  const node = findNode(state.selectedId);

  if (!node) {
    return;
  }

  if (settingInput) {
    updateNodeSetting(node, settingInput);
  } else {
    node.props[input.dataset.propName] = readPropInputValue(input);
  }

  markDraftDirty();
  renderCanvas();
  renderPreview();
  renderDraftStatus();
});

function render() {
  renderRouteContext();
  renderPalette();
  renderCanvas();
  renderProps();
  renderPreview();
}

async function loadRouteContext() {
  const params = new URLSearchParams(window.location.search);
  const routePathParam = params.get("route") || "/";
  const dataUrl = params.get("data") || createRouteDataUrl(routePathParam);

  try {
    const routeData = await fetchJson(dataUrl);
    const fragmentUrl = routeData.runtime?.fragmentUrl;
    const fragmentHtml = fragmentUrl ? await fetchText(fragmentUrl) : "";
    const template = await loadTemplateForRoute(routeData);

    const draftKey = createDraftKey(routeData.route?.path ?? routePathParam);

    state.route = {
      data: routeData,
      draftKey,
      error: null,
      fragmentHtml,
      loading: false
    };
    state.layout = ensureEditableLayout(loadDraft(draftKey) ?? template ?? createDefaultLayout(routeData), routeData);
  } catch (error) {
    state.route = {
      data: null,
      draftKey: null,
      error,
      fragmentHtml: "",
      loading: false
    };
  }
}

async function loadTemplateForRoute(routeData) {
  try {
    const manifest = await fetchJson("/data/templates/manifest.json");
    const scopes = createTemplateScopes(routeData);
    const template = manifest.templates?.find((item) => scopes.includes(item.scope));

    return template?.document ?? null;
  } catch {
    return null;
  }
}

function createTemplateScopes(routeData) {
  const routePath = routeData?.route?.path ?? "/";
  const content = routeData?.content ?? {};
  const scopes = [
    `route:${routePath}`,
    `content:${content.id}`
  ];

  if (routePath === "/") {
    scopes.push("home");
  }

  if (content.type?.startsWith("archive:")) {
    scopes.push(`taxonomy:${content.type.replace(/^archive:/, "")}`);
    scopes.push("archive");
  } else if (content.type) {
    scopes.push(`contentType:${content.type}`);
  }

  return scopes;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Không tải được JSON: ${url}`);
  }

  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Không tải được fragment: ${url}`);
  }

  return response.text();
}

function createRouteDataUrl(pathname) {
  const slug = pathname === "/" ? "index" : pathname.replace(/^\/+|\/+$/g, "");

  return `/data/routes/${slug || "index"}.json`;
}

function renderRouteContext() {
  const routeData = state.route.data;
  const content = routeData?.content;
  const route = routeData?.route;

  routeTitle.textContent = state.route.loading
    ? "Đang tải route..."
    : content?.title ?? "Chưa chọn route";
  routePath.textContent = route?.path ?? state.route.error?.message ?? "Mở từ Admin để nạp dữ liệu thật.";

  if (!routeMeta) {
    return;
  }

  if (state.route.loading) {
    routeMeta.innerHTML = '<p class="builder-muted">Đang tải route JSON và fragment...</p>';
    return;
  }

  if (state.route.error) {
    routeMeta.innerHTML = `<p class="builder-error">${escapeHtml(state.route.error.message)}</p>`;
    return;
  }

  routeMeta.innerHTML = `
    <dl>
      <dt>Path</dt><dd>${escapeHtml(route.path)}</dd>
      <dt>Type</dt><dd>${escapeHtml(content.type)}</dd>
      <dt>Title</dt><dd>${escapeHtml(content.title)}</dd>
      <dt>Slug</dt><dd>${escapeHtml(content.slug)}</dd>
      <dt>Data</dt><dd>${escapeHtml(routeData.runtime?.dataUrl)}</dd>
      <dt>Fragment</dt><dd>${escapeHtml(routeData.runtime?.fragmentUrl)}</dd>
      <dt>Draft key</dt><dd>${escapeHtml(state.route.draftKey)}</dd>
      <dt>SEO title</dt><dd>${escapeHtml(routeData.seo?.title || content.seo?.title || "Chưa có")}</dd>
      ${renderProductMeta(content)}
      ${renderBreadcrumbMeta(routeData)}
    </dl>
  `;
}

function createDefaultLayout(routeData) {
  const routePath = routeData?.route?.path ?? "/";
  const routeSlug = routePath === "/" ? "index" : routePath.replace(/^\/+/, "").replaceAll("/", "-");
  const title = routeData?.content?.title;

  return {
    contentTypes: [routeData?.content?.type ?? "page"],
    id: `builder-${routeSlug}`,
    name: title ? `Layout: ${title}` : "Default Page",
    sections: [{
      children: [],
      id: "main",
      settings: {
        width: "content"
      },
      type: "section"
    }],
    version: 1
  };
}

function ensureEditableLayout(layout, routeData) {
  const editable = structuredClone(layout);

  if (!Array.isArray(editable.sections) || editable.sections.length === 0) {
    editable.sections = [{
      children: [],
      id: "main",
      settings: {
        width: "content"
      },
      type: "section"
    }];
  }

  if (!editable.contentTypes?.length) {
    editable.contentTypes = [routeData?.content?.type ?? "page"];
  }

  return editable;
}

function createDraftKey(pathname) {
  const slug = pathname === "/" ? "index" : String(pathname ?? "/").replace(/^\/+|\/+$/g, "").replaceAll("/", "__");

  return `${DRAFT_PREFIX}${slug || "index"}`;
}

function loadDraft(key) {
  if (!key) {
    return null;
  }

  try {
    const record = JSON.parse(localStorage.getItem(key));

    if (!record?.layout) {
      return null;
    }

    state.draft = {
      restored: true,
      savedAt: record.savedAt ?? null
    };

    return record.layout;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function saveDraft() {
  if (!state.route.draftKey) {
    return;
  }

  const savedAt = new Date().toISOString();
  localStorage.setItem(state.route.draftKey, JSON.stringify({
    layout: state.layout,
    routePath: state.route.data?.route?.path ?? null,
    savedAt,
    version: 1
  }));
  state.draft = {
    restored: true,
    savedAt
  };
  renderDraftStatus();
}

function markDraftDirty() {
  if (state.draft.savedAt === null) {
    return;
  }

  state.draft = {
    ...state.draft,
    savedAt: null
  };
}

function renderDraftStatus() {
  if (!draftStatus) {
    return;
  }

  if (state.route.loading) {
    draftStatus.textContent = "Đang tải route";
    return;
  }

  if (state.route.error) {
    draftStatus.textContent = "Không có draft";
    return;
  }

  if (state.draft.savedAt) {
    draftStatus.textContent = `Draft đã lưu ${new Date(state.draft.savedAt).toLocaleTimeString("vi-VN")}`;
    return;
  }

  draftStatus.textContent = state.draft.restored ? "Draft có thay đổi chưa lưu" : "Draft mới";
}

function renderProductMeta(content) {
  if (content?.type !== "product") {
    return "";
  }

  const variants = content.variants ?? content.data?.variants ?? [];
  const price = content.data?.price ?? content.price ?? null;

  return `
    <dt>Price</dt><dd>${price === null ? "Chưa có" : escapeHtml(formatPrice(price))}</dd>
    <dt>Variants</dt><dd>${variants.length}</dd>
  `;
}

function renderBreadcrumbMeta(routeData) {
  const breadcrumbs = routeData.graph?.breadcrumbs ?? [];

  if (breadcrumbs.length === 0) {
    return "";
  }

  return `<dt>Breadcrumb</dt><dd>${breadcrumbs.map((item) => escapeHtml(item.label ?? item.title ?? item.slug)).join(" / ")}</dd>`;
}

function renderPalette() {
  palette.innerHTML = blocks.map((block, index) => `
    <button class="block-card" type="button" draggable="true" data-add-block="${index}">
      <strong>${escapeHtml(block.label)}</strong>
      <span>${escapeHtml(block.blockName)}</span>
    </button>
  `).join("");
}

function renderCanvas() {
  if (!canvas) {
    return;
  }

  const children = getRootChildren();
  canvas.innerHTML = children.length === 0
    ? '<p class="canvas-empty">Chọn block để bắt đầu layout.</p>'
    : children.map((node, index) => `
      <article class="canvas-node ${node.id === state.selectedId ? "is-selected" : ""}" data-node-id="${node.id}">
        <div>
          <strong>${escapeHtml(labelFor(node.blockName))}</strong>
          <span>${escapeHtml(node.blockName)}</span>
        </div>
        <div class="canvas-node__actions">
          <button type="button" title="Lên" data-node-id="${node.id}" data-action="up"${index === 0 ? " disabled" : ""}>↑</button>
          <button type="button" title="Xuống" data-node-id="${node.id}" data-action="down"${index === children.length - 1 ? " disabled" : ""}>↓</button>
          <button type="button" title="Xóa" data-node-id="${node.id}" data-action="remove">×</button>
        </div>
      </article>
    `).join("");
}

function renderProps() {
  layoutName.textContent = state.layout.name;
  renderDraftStatus();

  const node = findNode(state.selectedId);

  if (!node) {
    propsPanel.innerHTML = "<p>Click block trong preview để sửa props.</p>";
    return;
  }

  if (node.type !== "block") {
    propsPanel.innerHTML = renderSectionProps(node);
    return;
  }

  if (node.blockName === "site/header") {
    propsPanel.innerHTML = [
      renderHeaderProps(node),
      renderStyleFields(node)
    ].join("");
    return;
  }

  propsPanel.innerHTML = [
    ...Object.entries(node.props ?? {}).map(([key, value]) => renderPropField(key, value)),
    renderStyleFields(node)
  ].join("");
}

function renderPreview() {
  const nodes = getRootChildren();
  const builderBody = nodes.map((node) => renderSelectablePreviewNode(node)).join("");
  const body = `
    <main class="builder-preview-root" data-preview-root>
      ${builderBody || '<div class="builder-preview-empty">Kéo component từ sidebar và thả vào đây.</div>'}
    </main>
  `;
  preview.srcdoc = `
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; color: #162019; background: #fbfbf7; font: 13pt system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
          main { display: block; }
          img { max-width: 100%; height: auto; }
          hr { border: 0; border-top: 1px solid #d8dfd8; margin: 28px 0; }
          h1, h2, h3, p { margin: 0 0 14px; }
          .builder-preview-root { width: 100%; min-height: 100vh; padding: 0; border: 2px dashed #b7c8bd; background: #fbfdfb; }
          .builder-preview-root.is-dragging { border-color: #0f7a5f; background: #f0faf5; }
          .builder-preview-empty { display: grid; min-height: 220px; place-items: center; color: #647169; font-size: 15px; }
          .builder-preview-node { position: relative; margin-bottom: 0; border: 1px solid transparent; cursor: grab; }
          .builder-preview-node:active { cursor: grabbing; }
          .builder-preview-node:hover { border-color: #8fb7a9; }
          .builder-preview-node.is-selected { border-color: #0f7a5f; box-shadow: 0 0 0 3px rgba(15, 122, 95, 0.14); }
          .builder-preview-node.is-drop-before { border-top-color: #0f7a5f; box-shadow: inset 0 4px 0 #0f7a5f; }
          .builder-preview-node.is-drop-after { border-bottom-color: #0f7a5f; box-shadow: inset 0 -4px 0 #0f7a5f; }
          .builder-preview-node::before { position: absolute; top: -10px; left: 10px; display: none; padding: 2px 6px; border-radius: 999px; color: #fff; background: #0f7a5f; font-size: 11px; content: attr(data-block-label); }
          .builder-preview-node:hover::before,
          .builder-preview-node.is-selected::before { display: block; }
          .builder-preview-remove { position: absolute; top: -10px; right: -10px; z-index: 5; display: none; width: 26px; height: 26px; border: 1px solid #b42318; border-radius: 999px; color: #fff; background: #b42318; font-size: 16px; font-weight: 800; line-height: 1; cursor: pointer; }
          .builder-preview-node:hover > .builder-preview-remove,
          .builder-preview-node.is-selected > .builder-preview-remove { display: grid; place-items: center; }
          .builder-row-shell { width: 100%; }
          .builder-row { display: grid; width: var(--builder-row-width, 100%); max-width: var(--builder-row-max-width, none); margin-inline: auto; gap: var(--builder-row-gap, 16px); grid-template-columns: repeat(var(--builder-row-columns, 2), minmax(0, 1fr)); }
          .builder-column { min-height: 92px; padding: 10px; border: 1px dashed #b7c8bd; border-radius: 8px; background: #fff; }
          .builder-column.is-dragging { border-color: #0f7a5f; background: #f0faf5; }
          .builder-column-empty { display: grid; min-height: 68px; place-items: center; color: #8a988f; font-size: 13px; }
          .price { color: #0f7a5f; font-size: 28px; font-weight: 800; }
          .wpsc-site-header { display: grid; gap: 10px; border: 1px solid #d8dfd8; border-radius: 8px; padding: 14px 16px; background: #fff; }
          .wpsc-site-header__row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); align-items: center; gap: 14px; }
          .wpsc-site-header__column { display: flex; align-items: center; gap: 10px; min-width: 0; }
          .wpsc-site-logo { color: #0a5c48; font-size: 22px; font-weight: 800; text-decoration: none; }
          .wpsc-site-nav { display: flex; gap: 10px; flex-wrap: wrap; margin: 14px 0; }
          .wpsc-site-nav a { border: 1px solid #d8dfd8; border-radius: 6px; padding: 7px 10px; color: #0a5c48; text-decoration: none; }
          .theme-toggle { min-height: 36px; border: 1px solid #d8dfd8; border-radius: 6px; padding: 0 12px; background: #fff; color: #162019; }
          .archive-links { display: flex; gap: 8px; flex-wrap: wrap; }
          .archive-links a { border: 1px solid #d8dfd8; border-radius: 6px; padding: 7px 10px; color: #0a5c48; text-decoration: none; }
        </style>
      </head>
      <body>
        ${body}
        <script>
          const previewRoot = document.querySelector("[data-preview-root]");

          window.addEventListener("dragover", (event) => {
            event.preventDefault();
            previewRoot?.classList.add("is-dragging");
          });

          window.addEventListener("dragleave", () => {
            previewRoot?.classList.remove("is-dragging");
          });

          window.addEventListener("drop", (event) => {
            event.preventDefault();
            previewRoot?.classList.remove("is-dragging");
            document.querySelectorAll(".builder-column.is-dragging").forEach((column) => {
              column.classList.remove("is-dragging");
            });
            clearDropHints();
            const column = event.target.closest("[data-drop-column-id]");
            const target = findDropTarget(event);
            parent.postMessage({
              blockIndex: event.dataTransfer.getData("text/plain"),
              columnId: column?.dataset.dropColumnId || null,
              nodeId: event.dataTransfer.getData("application/x-wpsc-node-id") || null,
              position: target.position,
              targetNodeId: target.nodeId,
              type: "wpsc-builder-drop"
            }, "*");
          });

          document.addEventListener("dragstart", (event) => {
            const node = event.target.closest("[data-node-id]");

            if (!node || event.target.closest("[data-remove-node-id]")) {
              return;
            }

            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("application/x-wpsc-node-id", node.dataset.nodeId);
          });

          document.addEventListener("dragover", (event) => {
            const column = event.target.closest("[data-drop-column-id]");
            const target = findDropTarget(event);

            document.querySelectorAll(".builder-column.is-dragging").forEach((item) => {
              if (item !== column) {
                item.classList.remove("is-dragging");
              }
            });

            clearDropHints();
            if (target.element) {
              target.element.classList.add(target.position === "before" ? "is-drop-before" : "is-drop-after");
            }
            column?.classList.add("is-dragging");
          });

          function clearDropHints() {
            document.querySelectorAll(".builder-preview-node.is-drop-before, .builder-preview-node.is-drop-after").forEach((node) => {
              node.classList.remove("is-drop-before", "is-drop-after");
            });
          }

          function findDropTarget(event) {
            const node = event.target.closest("[data-node-id]");

            if (!node) {
              return {
                element: null,
                nodeId: null,
                position: "after"
              };
            }

            const rect = node.getBoundingClientRect();
            const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after";

            return {
              element: node,
              nodeId: node.dataset.nodeId,
              position
            };
          }

          document.addEventListener("click", (event) => {
            const removeButton = event.target.closest("[data-remove-node-id]");

            if (removeButton) {
              event.preventDefault();
              event.stopPropagation();
              parent.postMessage({
                nodeId: removeButton.dataset.removeNodeId,
                type: "wpsc-builder-remove"
              }, "*");
              return;
            }

            const node = event.target.closest("[data-node-id]");

            if (!node) {
              return;
            }

            event.preventDefault();
            parent.postMessage({
              nodeId: node.dataset.nodeId,
              type: "wpsc-builder-select"
            }, "*");
          });

          document.addEventListener("keydown", (event) => {
            if ((event.key !== "Delete" && event.key !== "Backspace") || event.target.closest("input, textarea, select, [contenteditable='true']")) {
              return;
            }

            const selectedNode = document.querySelector(".builder-preview-node.is-selected[data-node-id]");

            if (!selectedNode) {
              return;
            }

            event.preventDefault();
            parent.postMessage({
              nodeId: selectedNode.dataset.nodeId,
              type: "wpsc-builder-remove"
            }, "*");
          });
        <\/script>
      </body>
    </html>
  `;
}

function renderSectionProps(node) {
  const fields = [];

  if (node.settings?.kind === "row") {
    fields.push(
      `<p class="builder-muted">${escapeHtml(sectionLabelFor(node))}</p>`,
      renderSettingField("columns", node.children?.length || node.settings?.columns || 2, {
        max: 6,
        min: 1,
        type: "number"
      }),
      renderSettingField("gap", node.settings?.gap || "16px"),
      renderSettingField("contentWidth", node.settings?.contentWidth || "100%"),
      renderSettingField("contentMaxWidth", node.settings?.contentMaxWidth || "1340px")
    );
  } else {
    fields.push(`<p class="builder-muted">${escapeHtml(sectionLabelFor(node))}</p>`);
  }

  return [
    ...fields,
    renderStyleFields(node)
  ].join("");
}

function renderSettingField(key, value, options = {}) {
  const label = options.label ?? key;

  return `
    <label>
      ${escapeHtml(label)}
      <input
        data-setting-name="${escapeHtml(key)}"
        value="${escapeAttribute(value)}"
        ${options.type === "number" ? 'type="number"' : 'type="text"'}
        ${options.min ? `min="${escapeAttribute(options.min)}"` : ""}
        ${options.max ? `max="${escapeAttribute(options.max)}"` : ""}
      >
    </label>
  `;
}

function updateNodeSetting(node, input) {
  node.settings = node.settings ?? {};

  if (input.dataset.settingName === "columns") {
    setRowColumnCount(node, Number(input.value));
    return;
  }

  node.settings[input.dataset.settingName] = input.type === "number" ? Number(input.value) : input.value;
}

function renderStyleFields(node) {
  const settings = node.settings ?? {};

  return `
    <fieldset class="style-fields">
      <legend>Style</legend>
      ${STYLE_SETTINGS.map(([key, label]) => renderSettingField(key, settings[key] ?? "", {
        label
      })).join("")}
    </fieldset>
  `;
}

function setRowColumnCount(row, nextCount) {
  const count = clampColumnCount(nextCount);
  const columns = Array.isArray(row.children) ? row.children : [];

  while (columns.length < count) {
    columns.push(createColumnNode());
  }

  while (columns.length > count) {
    const removed = columns.pop();
    const lastColumn = columns[columns.length - 1];

    if (lastColumn && removed?.children?.length) {
      lastColumn.children = [...(lastColumn.children ?? []), ...removed.children];
    }
  }

  row.children = columns;
  row.settings.columns = count;
}

function formatPrice(value, currency = "VND") {
  return new Intl.NumberFormat("vi-VN", {
    currency,
    style: "currency"
  }).format(Number(value));
}

function openBuiltRoutePreview() {
  const routeData = state.route.data;
  const title = routeData?.seo?.title || routeData?.content?.title || state.layout.name;
  const html = createBuiltRoutePreviewHtml({
    body: getRootChildren().map((node) => renderBuiltPreviewNode(node)).join("") || '<main class="builder-preview-empty">Route chưa có component.</main>',
    title
  });
  const blob = new Blob([html], {
    type: "text/html"
  });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function createBuiltRoutePreviewHtml(options) {
  return `
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${escapeHtml(options.title)}</title>
        <style>
          body { margin: 0; color: #162019; background: #fbfbf7; font: 13pt system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
          main { width: min(100% - 32px, 1340px); margin-inline: auto; padding-block: 24px; }
          img { max-width: 100%; height: auto; }
          .wpsc-row { width: 100%; }
          .wpsc-row__inner { display: grid; width: var(--wpsc-row-content-width, 100%); max-width: var(--wpsc-row-content-max-width, 1340px); margin-inline: auto; gap: var(--wpsc-row-gap, 16px); grid-template-columns: repeat(var(--wpsc-row-columns, 2), minmax(0, 1fr)); }
          .wpsc-column { min-width: 0; }
          .price { color: #0f7a5f; font-size: 28px; font-weight: 800; }
          .wpsc-site-header { display: grid; gap: 10px; border: 1px solid #d8dfd8; border-radius: 8px; padding: 14px 16px; background: #fff; }
          .wpsc-site-header__row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); align-items: center; gap: 14px; }
          .wpsc-site-header__column { display: flex; align-items: center; gap: 10px; min-width: 0; }
          .wpsc-site-logo { color: #0a5c48; font-size: 22px; font-weight: 800; text-decoration: none; }
          .wpsc-site-nav { display: flex; gap: 10px; flex-wrap: wrap; margin: 14px 0; }
          .wpsc-site-nav a, .archive-links a { border: 1px solid #d8dfd8; border-radius: 6px; padding: 7px 10px; color: #0a5c48; text-decoration: none; }
          .theme-toggle { min-height: 36px; border: 1px solid #d8dfd8; border-radius: 6px; padding: 0 12px; background: #fff; color: #162019; }
          .archive-links { display: flex; gap: 8px; flex-wrap: wrap; }
        </style>
      </head>
      <body>
        <main>${options.body}</main>
      </body>
    </html>
  `;
}

function renderBuiltPreviewNode(node) {
  if (node.type === "block") {
    const nodeClass = node.settings?.className ? ` ${escapeAttribute(node.settings.className)}` : "";
    return `<div class="wpsc-block${nodeClass}" ${createInlineStyle(node.settings)}>${renderPreviewNode(node)}</div>`;
  }

  if (node.settings?.kind === "row") {
    const columns = Array.isArray(node.children) ? node.children : [];
    const nodeClass = node.settings?.className ? ` ${escapeAttribute(node.settings.className)}` : "";
    return `
      <section class="wpsc-row${nodeClass}" ${createInlineStyle(node.settings, ["contentWidth", "contentMaxWidth", "columns", "gap", "kind"])}>
        <div class="wpsc-row__inner" style="--wpsc-row-columns: ${columns.length || clampColumnCount(node.settings?.columns)}; --wpsc-row-gap: ${escapeAttribute(node.settings?.gap || "16px")}; --wpsc-row-content-width: ${escapeAttribute(node.settings?.contentWidth || "100%")}; --wpsc-row-content-max-width: ${escapeAttribute(node.settings?.contentMaxWidth || "1340px")}">
          ${columns.map((column) => renderBuiltPreviewNode(column)).join("")}
        </div>
      </section>
    `;
  }

  if (node.settings?.kind === "column") {
    const nodeClass = node.settings?.className ? ` ${escapeAttribute(node.settings.className)}` : "";
    return `<div class="wpsc-column${nodeClass}" ${createInlineStyle(node.settings, ["kind"])}>${(node.children ?? []).map((child) => renderBuiltPreviewNode(child)).join("")}</div>`;
  }

  return (node.children ?? []).map((child) => renderBuiltPreviewNode(child)).join("");
}

function addBlock(index, options = {}) {
  const block = blocks[Number(index)];

  if (!block) {
    return;
  }

  const node = createPaletteNode(block);
  const targetChildren = block.blockName === "layout/row"
    ? getRootChildren()
    : findColumnChildren(options.columnId) ?? getRootChildren();

  insertNode(targetChildren, node, options);
  state.selectedId = node.id;
  markDraftDirty();
  render();
}

function moveNode(id, options = {}) {
  const node = findNode(id);
  const targetColumn = options.columnId ? findNode(options.columnId) : null;

  if (!node || targetColumn?.id === id || options.targetNodeId === id || isDescendant(node, options.columnId)) {
    return;
  }

  const targetChildren = targetColumn?.settings?.kind === "column"
    ? findColumnChildren(options.columnId)
    : getRootChildren();
  const moved = takeNode(id);

  if (!moved || !targetChildren) {
    return;
  }

  insertNode(targetChildren, moved, options);
  state.selectedId = moved.id;
  markDraftDirty();
  render();
}

function insertNode(children, node, options = {}) {
  const targetIndex = children.findIndex((child) => child.id === options.targetNodeId);

  if (targetIndex === -1) {
    children.push(node);
    return;
  }

  const insertIndex = options.position === "before" ? targetIndex : targetIndex + 1;
  children.splice(insertIndex, 0, node);
}

function createPaletteNode(block) {
  if (block.blockName === "layout/row") {
    return createRowNode(block.props.columns, block.props);
  }

  return createBlockNode(block.blockName, structuredClone(block.props));
}

function applyHeaderDemo() {
  state.layout.sections[0].children = [
    createBlockNode("site/header", {
      logoHref: "/",
      logoText: state.route.data?.site?.title || "Tin Sinh Phát",
      navItems: [{
        href: "/",
        label: "Trang chủ"
      }, {
        href: "/shop",
        label: "Sản phẩm"
      }, {
        href: "/lien-he",
        label: "Liên hệ"
      }],
      rows: [{
        columns: [{
          children: [{
            blockName: "site/logo",
            props: {
              href: "/",
              text: state.route.data?.site?.title || "Tin Sinh Phát"
            }
          }]
        }, {
          children: [{
            blockName: "site/nav",
            props: {
              items: [{
                href: "/",
                label: "Trang chủ"
              }, {
                href: "/shop",
                label: "Sản phẩm"
              }, {
                href: "/lien-he",
                label: "Liên hệ"
              }]
            }
          }]
        }, {
          children: [{
            blockName: "site/dark-mode-toggle",
            props: {
              label: "Đổi giao diện sáng tối"
            }
          }]
        }]
      }],
      showDarkMode: true
    })
  ];
  state.selectedId = state.layout.sections[0].children[0].id;
  markDraftDirty();
  render();
}

function createBlockNode(blockName, props = {}) {
  return {
    blockName,
    id: `${blockName.replaceAll("/", "-")}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    props,
    settings: {},
    type: "block"
  };
}

function createRowNode(columnCount = 2, props = {}) {
  const count = clampColumnCount(columnCount);

  return {
    children: Array.from({ length: count }, () => createColumnNode()),
    id: `layout-row-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    settings: {
      columns: count,
      contentMaxWidth: props.contentMaxWidth ?? "1340px",
      contentWidth: props.contentWidth ?? "100%",
      gap: props.gap ?? "16px",
      kind: "row"
    },
    type: "section"
  };
}

function createColumnNode(children = []) {
  return {
    children,
    id: `layout-column-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    settings: {
      kind: "column"
    },
    type: "section"
  };
}

function updateNodeOrder(id, action) {
  if (action === "remove") {
    if (removeNode(id)) {
      markDraftDirty();
      render();
    }
    return;
  }

  const children = findSiblings(id);

  if (!children) {
    return;
  }

  const index = children.findIndex((node) => node.id === id);

  if (index === -1) {
    return;
  }

  if (action === "up" && index > 0) {
    [children[index - 1], children[index]] = [children[index], children[index - 1]];
    markDraftDirty();
  }

  if (action === "down" && index < children.length - 1) {
    [children[index + 1], children[index]] = [children[index], children[index + 1]];
    markDraftDirty();
  }

  render();
}

function selectPanel(name) {
  root.querySelectorAll("[data-panel-button]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.panelButton === name);
  });
  root.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === name);
  });
}

function findNode(id) {
  return findNodeDeep(getRootChildren(), id);
}

function findNodeDeep(nodes, id) {
  for (const node of nodes ?? []) {
    if (node.id === id) {
      return node;
    }

    const child = findNodeDeep(node.children, id);

    if (child) {
      return child;
    }
  }

  return null;
}

function findSiblings(id, nodes = getRootChildren()) {
  if (!Array.isArray(nodes)) {
    return null;
  }

  if (nodes.some((node) => node.id === id)) {
    return nodes;
  }

  for (const node of nodes) {
    const siblings = findSiblings(id, node.children);

    if (siblings) {
      return siblings;
    }
  }

  return null;
}

function findColumnChildren(columnId) {
  if (!columnId) {
    return null;
  }

  const column = findNode(columnId);

  if (column?.settings?.kind !== "column") {
    return null;
  }

  column.children = Array.isArray(column.children) ? column.children : [];
  return column.children;
}

function removeNode(id, nodes = getRootChildren()) {
  if (!Array.isArray(nodes)) {
    return false;
  }

  const index = nodes.findIndex((node) => node.id === id);

  if (index >= 0) {
    nodes.splice(index, 1);
    state.selectedId = null;
    return true;
  }

  return nodes.some((node) => removeNode(id, node.children));
}

function takeNode(id, nodes = getRootChildren()) {
  if (!Array.isArray(nodes)) {
    return null;
  }

  const index = nodes.findIndex((node) => node.id === id);

  if (index >= 0) {
    return nodes.splice(index, 1)[0];
  }

  for (const node of nodes) {
    const found = takeNode(id, node.children);

    if (found) {
      return found;
    }
  }

  return null;
}

function getRootChildren() {
  state.layout.sections[0].children = Array.isArray(state.layout.sections[0].children)
    ? state.layout.sections[0].children
    : [];

  return state.layout.sections[0].children;
}

function labelFor(blockName) {
  return blocks.find((block) => block.blockName === blockName)?.label ?? blockName;
}

function sectionLabelFor(node) {
  if (node.settings?.kind === "row") {
    return "Row";
  }

  if (node.settings?.kind === "column") {
    return "Column";
  }

  return "Section";
}

function clampColumnCount(value) {
  return Math.max(1, Math.min(6, Number(value) || 2));
}

function isEditingText(target) {
  return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
}

function isDescendant(parent, childId) {
  if (!childId || !Array.isArray(parent?.children)) {
    return false;
  }

  return parent.children.some((child) => child.id === childId || isDescendant(child, childId));
}

function renderSelectablePreviewNode(node) {
  const nodeStyle = createInlineStyle(node.settings);
  const nodeClass = node.settings?.className ? ` ${escapeAttribute(node.settings.className)}` : "";

  if (node.type !== "block") {
    return renderSelectableSectionNode(node);
  }

  return `
    <section
      class="builder-preview-node${nodeClass} ${node.id === state.selectedId ? "is-selected" : ""}"
      data-block-label="${escapeAttribute(labelFor(node.blockName))}"
      data-node-id="${escapeAttribute(node.id)}"
      draggable="true"
      ${nodeStyle}
    >
      <button class="builder-preview-remove" type="button" aria-label="Xóa khỏi layout" data-remove-node-id="${escapeAttribute(node.id)}">×</button>
      ${renderPreviewNode(node)}
    </section>
  `;
}

function renderSelectableSectionNode(node) {
  const isRow = node.settings?.kind === "row";
  const isColumn = node.settings?.kind === "column";
  const label = isRow ? "Row" : "Column";
  const children = Array.isArray(node.children) ? node.children : [];

  if (isRow) {
    const columns = children.length || clampColumnCount(node.settings?.columns);
    const nodeStyle = createInlineStyle(node.settings, ["contentWidth", "contentMaxWidth", "columns", "gap", "kind"]);
    const nodeClass = node.settings?.className ? ` ${escapeAttribute(node.settings.className)}` : "";
    return `
      <section
        class="builder-preview-node${nodeClass} ${node.id === state.selectedId ? "is-selected" : ""}"
        data-block-label="${label}"
        data-node-id="${escapeAttribute(node.id)}"
        draggable="true"
        ${nodeStyle}
      >
        <button class="builder-preview-remove" type="button" aria-label="Xóa khỏi layout" data-remove-node-id="${escapeAttribute(node.id)}">×</button>
        <div class="builder-row-shell">
          <div class="builder-row" style="--builder-row-columns: ${columns}; --builder-row-gap: ${escapeAttribute(node.settings?.gap || "16px")}; --builder-row-width: ${escapeAttribute(node.settings?.contentWidth || "100%")}; --builder-row-max-width: ${escapeAttribute(node.settings?.contentMaxWidth || "none")}">
            ${children.map((child) => renderSelectablePreviewNode(child)).join("")}
          </div>
        </div>
      </section>
    `;
  }

  if (isColumn) {
    const nodeStyle = createInlineStyle(node.settings, ["kind"]);
    const nodeClass = node.settings?.className ? ` ${escapeAttribute(node.settings.className)}` : "";
    return `
      <div class="builder-column${nodeClass}" data-drop-column-id="${escapeAttribute(node.id)}" ${nodeStyle}>
        ${children.length > 0
          ? children.map((child) => renderSelectablePreviewNode(child)).join("")
          : '<div class="builder-column-empty">Thả component vào cột này.</div>'}
      </div>
    `;
  }

  return children.map((child) => renderSelectablePreviewNode(child)).join("");
}

function createInlineStyle(settings = {}, exclude = []) {
  const excluded = new Set(exclude);
  const style = {
    "background": settings.background,
    "color": settings.color,
    "height": settings.height,
    "margin": settings.margin,
    "max-width": settings.maxWidth,
    "padding": settings.padding,
    "width": settings.width
  };
  const text = Object.entries(style)
    .filter(([key, value]) => !excluded.has(toCamelCase(key)) && value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}: ${escapeAttribute(value)}`)
    .join("; ");

  return text ? `style="${text}"` : "";
}

function toCamelCase(value) {
  return value.replaceAll(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function renderPreviewNode(node) {
  const routeData = state.route.data;
  const content = routeData?.content;

  if (node.blockName === "core/heading") {
    const level = Math.max(1, Math.min(6, Number(node.props.level) || 2));
    const text = node.props.text || content?.title || "Tiêu đề";

    return `<h${level}>${escapeHtml(text)}</h${level}>`;
  }

  if (node.blockName === "core/content-text") {
    return `<div class="content-text">${sanitizePreviewHtml(resolveContentText(content, node.props))}</div>`;
  }

  if (node.blockName === "site/logo") {
    const siteTitle = state.route.data?.site?.title || "Site";
    const label = node.props.text || siteTitle;

    return `<a class="wpsc-site-logo" href="${escapeAttribute(normalizeHref(node.props.href))}">${escapeHtml(label)}</a>`;
  }

  if (node.blockName === "site/nav") {
    const items = Array.isArray(node.props.items) ? node.props.items : [];

    if (items.length === 0) {
      return "";
    }

    return `<nav class="wpsc-site-nav" aria-label="${escapeAttribute(node.props.ariaLabel || "Primary")}">${items.map((item) => (
      `<a href="${escapeAttribute(normalizeHref(item.href))}">${escapeHtml(item.label)}</a>`
    )).join("")}</nav>`;
  }

  if (node.blockName === "site/dark-mode-toggle") {
    return `<button class="theme-toggle" type="button" aria-label="${escapeAttribute(node.props.label)}" aria-pressed="false"><span aria-hidden="true">L</span><span aria-hidden="true">D</span></button>`;
  }

  if (node.blockName === "site/header") {
    const siteTitle = state.route.data?.site?.title || "Site";
    const logoText = node.props.logoText || siteTitle;
    const navItems = Array.isArray(node.props.navItems) ? node.props.navItems : [];
    const rows = Array.isArray(node.props.rows) ? node.props.rows : [];

    return [
      '<header class="wpsc-site-header">',
      rows.length > 0
        ? renderHeaderRowsPreview(rows, { logoHref: node.props.logoHref, logoText, navItems, showDarkMode: node.props.showDarkMode !== false })
        : renderLegacyHeaderPreview({ logoHref: node.props.logoHref, logoText, navItems, showDarkMode: node.props.showDarkMode !== false }),
      "</header>"
    ].join("");
  }

  if (node.blockName === "commerce/product-price") {
    const commerce = content?.commerce ?? {};
    const data = content?.data ?? {};
    const price = data.price ?? commerce.price ?? commerce.salePrice ?? commerce.regularPrice;
    const currency = node.props.currency || data.currency || commerce.currency || "VND";

    return `<p class="price">${price == null ? "Chưa có giá" : formatPrice(price, currency)}</p>`;
  }

  if (node.blockName === "commerce/archive-links") {
    const links = createArchiveLinks(routeData);

    if (links.length === 0) {
      return "";
    }

    return `<nav class="archive-links" aria-label="${escapeAttribute(node.props.label)}">${links.map((link) => (
      `<a href="${escapeAttribute(link.path)}">${escapeHtml(link.label)}</a>`
    )).join("")}</nav>`;
  }

  return "";
}

function renderPropField(key, value) {
  if (Array.isArray(value)) {
    return `
      <label>
        ${escapeHtml(key)}
        <textarea data-prop-name="${escapeHtml(key)}" data-prop-type="nav-items" rows="5">${escapeHtml(formatNavItems(value))}</textarea>
        <small>Mỗi dòng: Nhãn | /duong-dan</small>
      </label>
    `;
  }

  return `
    <label>
      ${escapeHtml(key)}
      <input data-prop-name="${escapeHtml(key)}" value="${escapeAttribute(value)}" ${typeof value === "number" ? 'type="number"' : 'type="text"'}>
    </label>
  `;
}

function renderHeaderProps(node) {
  const rows = Array.isArray(node.props.rows) ? node.props.rows : [];

  return [
    '<div class="header-layout-editor">',
    '<button type="button" data-header-action="add-row">Thêm dòng</button>',
    rows.length === 0 ? '<p class="builder-muted">Header chưa có dòng nào.</p>' : "",
    ...rows.map((row, rowIndex) => renderHeaderRowEditor(row, rowIndex)),
    "</div>",
    renderPropField("logoText", node.props.logoText ?? ""),
    renderPropField("logoHref", node.props.logoHref ?? "/"),
    renderPropField("navItems", node.props.navItems ?? []),
    renderPropField("showDarkMode", node.props.showDarkMode === false ? "false" : "true")
  ].join("");
}

function renderHeaderRowEditor(row, rowIndex) {
  const columns = Array.isArray(row.columns) ? row.columns : [];

  return `
    <section class="header-layout-row">
      <div class="header-layout-row__bar">
        <strong>Dòng ${rowIndex + 1}</strong>
        <button type="button" data-header-action="add-column" data-row-index="${rowIndex}">Thêm cột</button>
        <button type="button" data-header-action="remove-row" data-row-index="${rowIndex}">Xóa dòng</button>
      </div>
      <div class="header-layout-columns">
        ${columns.map((column, columnIndex) => renderHeaderColumnEditor(column, rowIndex, columnIndex)).join("")}
      </div>
    </section>
  `;
}

function renderHeaderColumnEditor(column, rowIndex, columnIndex) {
  const children = Array.isArray(column.children) ? column.children : [];

  return `
    <article class="header-layout-column">
      <div class="header-layout-column__bar">
        <strong>Cột ${columnIndex + 1}</strong>
        <button type="button" data-header-action="remove-column" data-row-index="${rowIndex}" data-column-index="${columnIndex}">Xóa</button>
      </div>
      <div class="header-layout-children">
        ${children.length === 0 ? '<span class="builder-muted">Trống</span>' : children.map((child) => `<span>${escapeHtml(labelFor(child.blockName))}</span>`).join("")}
      </div>
      <div class="header-layout-add">
        <button type="button" data-header-action="add-child" data-child-block="site/logo" data-row-index="${rowIndex}" data-column-index="${columnIndex}">Logo</button>
        <button type="button" data-header-action="add-child" data-child-block="site/nav" data-row-index="${rowIndex}" data-column-index="${columnIndex}">Nav</button>
        <button type="button" data-header-action="add-child" data-child-block="site/dark-mode-toggle" data-row-index="${rowIndex}" data-column-index="${columnIndex}">Dark</button>
        <button type="button" data-header-action="clear-column" data-row-index="${rowIndex}" data-column-index="${columnIndex}">Clear</button>
      </div>
    </article>
  `;
}

function updateHeaderLayout(button) {
  const node = findNode(state.selectedId);

  if (!node || node.blockName !== "site/header") {
    return;
  }

  const rows = Array.isArray(node.props.rows) ? node.props.rows : [];
  node.props.rows = rows;
  const rowIndex = Number(button.dataset.rowIndex);
  const columnIndex = Number(button.dataset.columnIndex);

  if (button.dataset.headerAction === "add-row") {
    rows.push({ columns: [{ children: [] }] });
  }

  if (button.dataset.headerAction === "remove-row") {
    rows.splice(rowIndex, 1);
  }

  if (button.dataset.headerAction === "add-column") {
    rows[rowIndex]?.columns?.push({ children: [] });
  }

  if (button.dataset.headerAction === "remove-column") {
    rows[rowIndex]?.columns?.splice(columnIndex, 1);
  }

  if (button.dataset.headerAction === "clear-column") {
    rows[rowIndex].columns[columnIndex].children = [];
  }

  if (button.dataset.headerAction === "add-child") {
    const column = rows[rowIndex]?.columns?.[columnIndex];
    if (column) {
      column.children = [...(column.children ?? []), createHeaderChild(button.dataset.childBlock)];
    }
  }

  markDraftDirty();
  render();
}

function createHeaderChild(blockName) {
  if (blockName === "site/logo") {
    return {
      blockName,
      props: {
        href: "/",
        text: state.route.data?.site?.title || "Tin Sinh Phát"
      }
    };
  }

  if (blockName === "site/nav") {
    return {
      blockName,
      props: {
        items: [{
          href: "/",
          label: "Trang chủ"
        }, {
          href: "/shop",
          label: "Sản phẩm"
        }, {
          href: "/lien-he",
          label: "Liên hệ"
        }]
      }
    };
  }

  return {
    blockName: "site/dark-mode-toggle",
    props: {
      label: "Đổi giao diện sáng tối"
    }
  };
}

function readPropInputValue(input) {
  if (input.dataset.propType === "nav-items") {
    return parseNavItems(input.value);
  }

  if (input.value === "true") {
    return true;
  }

  if (input.value === "false") {
    return false;
  }

  return input.type === "number" ? Number(input.value) : input.value;
}

function formatNavItems(items) {
  return items.map((item) => `${item.label ?? ""} | ${item.href ?? ""}`).join("\n");
}

function parseNavItems(value) {
  return String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, href = ""] = line.split("|").map((part) => part.trim());

      return {
        href: normalizeHref(href || "#"),
        label: label || href || "Link"
      };
    });
}

function normalizeHref(value) {
  const href = String(value ?? "").trim();

  if (!href) {
    return "#";
  }

  if (href.startsWith("#") || href.startsWith("/") || href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }

  return `/${href.replace(/^\/+/, "")}`;
}

function renderLegacyHeaderPreview(options) {
  return [
    options.logoText ? `<a class="wpsc-site-logo" href="${escapeAttribute(normalizeHref(options.logoHref))}">${escapeHtml(options.logoText)}</a>` : "",
    options.navItems.length > 0
      ? `<nav class="wpsc-site-nav" aria-label="Primary">${options.navItems.map((item) => (
        `<a href="${escapeAttribute(normalizeHref(item.href))}">${escapeHtml(item.label)}</a>`
      )).join("")}</nav>`
      : "",
    options.showDarkMode ? '<button class="theme-toggle" type="button" aria-label="Đổi giao diện sáng tối" aria-pressed="false"><span aria-hidden="true">L</span><span aria-hidden="true">D</span></button>' : ""
  ].join("");
}

function renderHeaderRowsPreview(rows, context) {
  return rows.map((row) => {
    const columns = Array.isArray(row.columns) ? row.columns : [];

    return [
      '<div class="wpsc-site-header__row">',
      ...columns.map((column) => [
        '<div class="wpsc-site-header__column">',
        ...(Array.isArray(column.children) ? column.children : []).map((child) => renderHeaderChildPreview(child, context)),
        "</div>"
      ].join("")),
      "</div>"
    ].join("");
  }).join("");
}

function renderHeaderChildPreview(child, context) {
  if (child.blockName === "site/logo") {
    const text = child.props?.text || context.logoText;
    return text ? `<a class="wpsc-site-logo" href="${escapeAttribute(normalizeHref(child.props?.href ?? context.logoHref))}">${escapeHtml(text)}</a>` : "";
  }

  if (child.blockName === "site/nav") {
    const items = Array.isArray(child.props?.items) ? child.props.items : context.navItems;
    return items.length > 0
      ? `<nav class="wpsc-site-nav" aria-label="Primary">${items.map((item) => (
        `<a href="${escapeAttribute(normalizeHref(item.href))}">${escapeHtml(item.label)}</a>`
      )).join("")}</nav>`
      : "";
  }

  if (child.blockName === "site/dark-mode-toggle") {
    return context.showDarkMode ? '<button class="theme-toggle" type="button" aria-label="Đổi giao diện sáng tối" aria-pressed="false"><span aria-hidden="true">L</span><span aria-hidden="true">D</span></button>' : "";
  }

  return "";
}

function resolveContentText(content, props) {
  const field = props.field || "content";
  const data = content?.data ?? {};
  const value = field === "excerpt"
    ? content?.excerpt
    : field === "description"
      ? data.description ?? data.headline
      : content?.content ?? data.description ?? data.headline;

  return value || props.fallback || "";
}

function createArchiveLinks(routeData) {
  const content = routeData?.content;
  const contentLinks = content?.data?.archiveLinks;

  if (Array.isArray(contentLinks) && contentLinks.length > 0) {
    return contentLinks.map((link) => ({
      label: link.label ?? link.title ?? link.slug ?? link.href,
      path: link.href ?? link.path ?? `/${link.slug}`
    })).filter((link) => link.label && link.path);
  }

  const terms = [
    ...(content?.taxonomies?.terms ?? []),
    ...(routeData?.graph?.breadcrumbs ?? []).filter((item) => item.type === "term")
  ];
  const unique = new Map();

  terms.forEach((term) => {
    const slug = term.slug;

    if (!slug || unique.has(slug)) {
      return;
    }

    unique.set(slug, {
      label: term.name ?? term.label ?? slug,
      path: term.path ?? `/${slug}`
    });
  });

  return [...unique.values()];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function sanitizePreviewHtml(value) {
  const template = document.createElement("template");
  template.innerHTML = String(value ?? "");

  template.content.querySelectorAll("script, style, iframe, object, embed").forEach((node) => {
    node.remove();
  });

  template.content.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const content = attribute.value.trim().toLowerCase();

      if (name.startsWith("on") || content.startsWith("javascript:")) {
        node.removeAttribute(attribute.name);
      }
    });
  });

  return template.innerHTML;
}
