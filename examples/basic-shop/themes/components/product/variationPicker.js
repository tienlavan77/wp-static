import { escapeAttribute, escapeText } from "../shared/html.js";

export function renderVariantOptions(variants) {
  const groups = createVariantGroups(variants);

  return `
    <div class="storefront-variant-box">
      <div class="storefront-variant-box__header">
        <strong>Chọn sản phẩm</strong>
        <button type="button" data-variant-clear hidden>Clear</button>
      </div>
      ${groups.map((group) => `
        <div class="storefront-variant-group" data-variant-attribute="${escapeAttribute(group.key)}">
          <span>${escapeText(group.name)}</span>
          <div>
            ${group.options.map((option) => `<button type="button" data-variant-option="${escapeAttribute(option)}">${escapeText(option)}</button>`).join("")}
          </div>
        </div>
      `).join("")}
      <p class="storefront-variant-status" data-variant-status>Chọn đủ tùy chọn để xem đúng giá và thêm vào báo giá.</p>
    </div>
  `;
}

function createVariantGroups(variants) {
  const groups = new Map();

  for (const variant of variants) {
    for (const attribute of variant.attributes ?? []) {
      const key = attribute.slug ?? attribute.name;
      const group = groups.get(key) ?? {
        key,
        name: attribute.name ?? attribute.slug ?? "Tùy chọn",
        options: new Set()
      };

      if (attribute.option) {
        group.options.add(decodeHtmlEntities(attribute.option));
      }

      groups.set(key, group);
    }
  }

  return [...groups.values()].map((group) => ({
    key: group.key,
    name: group.name,
    options: sortVariantOptions(group).slice(0, 12)
  }));
}

function sortVariantOptions(group) {
  const options = [...group.options];
  const key = normalizeText(group.key);
  const name = normalizeText(group.name);

  if (key.includes("so-luong") || key.includes("quantity") || name.includes("so luong") || name.includes("quantity")) {
    return options.sort(sortNumericText);
  }

  return options;
}

function sortNumericText(a, b) {
  const numberA = Number.parseFloat(String(a).replace(/[^\d.]/g, ""));
  const numberB = Number.parseFloat(String(b).replace(/[^\d.]/g, ""));

  if (Number.isFinite(numberA) && Number.isFinite(numberB)) {
    return numberA - numberB;
  }

  return String(a).localeCompare(String(b), "vi");
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—");
}
