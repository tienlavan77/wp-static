import escapeHtml from "../shared/escapeHtml.js";

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

function escapeTemplateValue(value) {
  if (Array.isArray(value)) {
    return value.map(escapeTemplateValue).join("");
  }

  if (value === null || value === undefined) {
    return "";
  }

  return escapeHtml(value);
}
