const blocks = [
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
      fallback: "Nội dung mô tả"
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
  selectedId: null
};

const root = document.querySelector("[data-builder-root]");
const palette = root.querySelector("[data-block-palette]");
const canvas = root.querySelector("[data-canvas]");
const propsPanel = root.querySelector("[data-props-panel]");
const preview = root.querySelector("[data-preview]");

render();

root.addEventListener("click", (event) => {
  const panelButton = event.target.closest("[data-panel-button]");
  const blockButton = event.target.closest("[data-add-block]");
  const nodeButton = event.target.closest("[data-node-id]");
  const actionButton = event.target.closest("[data-action]");

  if (panelButton) {
    selectPanel(panelButton.dataset.panelButton);
    return;
  }

  if (blockButton) {
    addBlock(blockButton.dataset.addBlock);
    return;
  }

  if (actionButton) {
    updateNodeOrder(actionButton.dataset.nodeId, actionButton.dataset.action);
    return;
  }

  if (nodeButton) {
    state.selectedId = nodeButton.dataset.nodeId;
    render();
  }
});

root.querySelector("[data-save-layout]").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state.layout, null, 2)], {
    type: "application/json"
  });
  const link = document.createElement("a");
  link.download = `${state.layout.id}.json`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
});

propsPanel.addEventListener("input", (event) => {
  const input = event.target.closest("[data-prop-name]");

  if (!input) {
    return;
  }

  const node = findNode(state.selectedId);
  node.props[input.dataset.propName] = input.type === "number" ? Number(input.value) : input.value;
  renderCanvas();
  renderPreview();
});

function render() {
  renderPalette();
  renderCanvas();
  renderProps();
  renderPreview();
}

function renderPalette() {
  palette.innerHTML = blocks.map((block, index) => `
    <button class="block-card" type="button" data-add-block="${index}">
      <strong>${escapeHtml(block.label)}</strong>
      <span>${escapeHtml(block.blockName)}</span>
    </button>
  `).join("");
}

function renderCanvas() {
  const children = state.layout.sections[0].children;
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
  const node = findNode(state.selectedId);

  if (!node) {
    propsPanel.innerHTML = "<p>Chọn block trên canvas để sửa props.</p>";
    return;
  }

  propsPanel.innerHTML = Object.entries(node.props ?? {}).map(([key, value]) => `
    <label>
      ${escapeHtml(key)}
      <input data-prop-name="${escapeHtml(key)}" value="${escapeAttribute(value)}" ${typeof value === "number" ? 'type="number"' : 'type="text"'}>
    </label>
  `).join("");
}

function renderPreview() {
  const nodes = state.layout.sections[0].children;
  const body = nodes.map((node) => renderPreviewNode(node)).join("");
  preview.srcdoc = `
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 28px; color: #162019; font-family: system-ui, sans-serif; }
          h1, h2, h3, p { margin: 0 0 14px; }
          .price { color: #0f7a5f; font-size: 28px; font-weight: 800; }
          .archive-links { display: flex; gap: 8px; flex-wrap: wrap; }
          .archive-links a { border: 1px solid #d8dfd8; border-radius: 6px; padding: 7px 10px; color: #0a5c48; text-decoration: none; }
        </style>
      </head>
      <body>${body || "<p>Preview đang trống.</p>"}</body>
    </html>
  `;
}

function addBlock(index) {
  const block = blocks[Number(index)];
  const node = {
    blockName: block.blockName,
    id: `${block.blockName.replaceAll("/", "-")}-${Date.now()}`,
    props: {
      ...block.props
    },
    type: "block"
  };

  state.layout.sections[0].children.push(node);
  state.selectedId = node.id;
  render();
}

function updateNodeOrder(id, action) {
  const children = state.layout.sections[0].children;
  const index = children.findIndex((node) => node.id === id);

  if (index === -1) {
    return;
  }

  if (action === "remove") {
    children.splice(index, 1);
    state.selectedId = children[index]?.id ?? children[index - 1]?.id ?? null;
  }

  if (action === "up" && index > 0) {
    [children[index - 1], children[index]] = [children[index], children[index - 1]];
  }

  if (action === "down" && index < children.length - 1) {
    [children[index + 1], children[index]] = [children[index], children[index + 1]];
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
  return state.layout.sections[0].children.find((node) => node.id === id) ?? null;
}

function labelFor(blockName) {
  return blocks.find((block) => block.blockName === blockName)?.label ?? blockName;
}

function renderPreviewNode(node) {
  if (node.blockName === "core/heading") {
    const level = Math.max(1, Math.min(6, Number(node.props.level) || 2));
    return `<h${level}>${escapeHtml(node.props.text)}</h${level}>`;
  }

  if (node.blockName === "core/content-text") {
    return `<p>${escapeHtml(node.props.fallback)}</p>`;
  }

  if (node.blockName === "commerce/product-price") {
    return `<p class="price">${new Intl.NumberFormat("vi-VN", { currency: node.props.currency || "VND", style: "currency" }).format(19900000)}</p>`;
  }

  if (node.blockName === "commerce/archive-links") {
    return `<nav class="archive-links" aria-label="${escapeAttribute(node.props.label)}"><a href="/dien-thoai">Điện thoại</a><a href="/thoi-trang">Thời trang</a></nav>`;
  }

  return "";
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
