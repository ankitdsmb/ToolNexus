export function getFormattingOptions(elements) {
  return {
    pretty: elements.prettyToggle.checked,
    indent: Number.parseInt(elements.indentSelect.value, 10) === 4 ? 4 : 2,
    sortKeys: elements.sortKeysToggle.checked,
    autoTypes: elements.autoTypesToggle.checked,
    strictStrings: elements.strictStringsToggle.checked,
    parseDates: elements.parseDatesToggle.checked
  };
}

export function formatJson(value, options) {
  const spacing = options.pretty ? options.indent : 0;
  return JSON.stringify(value, null, spacing);
}
