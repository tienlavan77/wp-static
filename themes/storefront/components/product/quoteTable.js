import { formatPrice } from "../shared/format.js";
import { escapeText } from "../shared/html.js";

export function renderQuoteTable(variants, currency = "VND") {
  const matrix = createQuoteMatrix(variants);

  if (matrix.rows.length === 0 || matrix.columns.length === 0) {
    return "";
  }

  return `
    <div class="storefront-quote-table" id="bao-gia">
      <div class="storefront-quote-table__heading">
        <h2>Bảng báo giá</h2>
        <span>${escapeText(matrix.quantityLabel)} / ${escapeText(matrix.finishLabel)}</span>
      </div>
      <div class="storefront-quote-table__scroll">
        <table>
          <thead>
            <tr>
              <th>${escapeText(matrix.quantityLabel)}</th>
              ${matrix.columns.map((column) => `<th>${escapeText(column)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${matrix.rows.map((row) => `
              <tr>
                <th>${escapeText(row)}</th>
                ${matrix.columns.map((column) => `<td>${escapeText(formatPrice(matrix.prices.get(`${row}::${column}`), currency))}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function createQuoteMatrix(variants) {
  const quantityKey = findAttributeKey(variants, "so-luong") ?? findAttributeKey(variants, "quantity");
  const finishKey = findAttributeKey(variants, "kieu-thanh-pham") ?? findAttributeKey(variants, "finish");
  const fallbackKeys = collectAttributeKeys(variants);
  const rowKey = quantityKey ?? fallbackKeys[0];
  const columnKey = finishKey ?? fallbackKeys.find((key) => key !== rowKey);
  const rows = new Set();
  const columns = new Set();
  const prices = new Map();

  if (!rowKey || !columnKey) {
    return {
      columns: [],
      finishLabel: "Thành phẩm",
      prices,
      quantityLabel: "Số lượng",
      rows: []
    };
  }

  for (const variant of variants) {
    const row = findVariantOption(variant, rowKey);
    const column = findVariantOption(variant, columnKey);

    if (!row || !column) {
      continue;
    }

    rows.add(row);
    columns.add(column);
    prices.set(`${row}::${column}`, variant.price ?? variant.salePrice ?? variant.regularPrice);
  }

  return {
    columns: [...columns],
    finishLabel: findAttributeLabel(variants, columnKey) ?? "Thành phẩm",
    prices,
    quantityLabel: findAttributeLabel(variants, rowKey) ?? "Số lượng",
    rows: [...rows].sort(sortNumericText)
  };
}

function collectAttributeKeys(variants) {
  return [...new Set(variants.flatMap((variant) => (variant.attributes ?? []).map((attribute) => attribute.slug ?? attribute.name).filter(Boolean)))];
}

function findAttributeKey(variants, needle) {
  return collectAttributeKeys(variants).find((key) => normalizeText(key).includes(needle));
}

function findAttributeLabel(variants, key) {
  for (const variant of variants) {
    const attribute = (variant.attributes ?? []).find((item) => (item.slug ?? item.name) === key);

    if (attribute?.name) {
      return attribute.name;
    }
  }

  return null;
}

function findVariantOption(variant, key) {
  const attribute = (variant.attributes ?? []).find((item) => (item.slug ?? item.name) === key);

  return attribute?.option ? decodeHtmlEntities(attribute.option) : "";
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
