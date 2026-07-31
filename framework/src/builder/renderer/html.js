import escapeHtml from "../../shared/escapeHtml.js";

const RAW_HTML = Symbol("rawHtml");

export default function html(strings, ...values) {
  let output = "";

  for (let index = 0; index < strings.length; index += 1) {
    output += strings[index];

    if (index < values.length) {
      output += escapeTemplateValue(values[index]);
    }
  }

  return output;
}

html.raw = function raw(value) {
  return {
    [RAW_HTML]: true,
    value: String(value ?? "")
  };
};

function escapeTemplateValue(value) {
  if (Array.isArray(value)) {
    return value.map(escapeTemplateValue).join("");
  }

  if (value?.[RAW_HTML]) {
    return value.value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  return escapeHtml(value);
}
