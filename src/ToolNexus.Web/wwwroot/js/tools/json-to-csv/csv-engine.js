const FORMULA_PREFIX = /^[=+\-@]/;

function escapeField(value, delimiter) {
  const stringValue = value ?? '';
  const escapedValue = String(stringValue).replaceAll('"', '""');
  const shouldQuote = escapedValue.includes(delimiter)
    || escapedValue.includes('"')
    || escapedValue.includes('\n')
    || escapedValue.includes('\r');

  return shouldQuote ? `"${escapedValue}"` : escapedValue;
}

function sanitizeCell(value, preventCsvInjection) {
  if (!preventCsvInjection) {
    return value;
  }

  const stringValue = String(value ?? '');
  if (FORMULA_PREFIX.test(stringValue)) {
    return `'${stringValue}`;
  }

  return stringValue;
}

export function buildCsv(headers, rows, options) {
  const delimiter = options.delimiter;
  const allRows = [];

  allRows.push(headers.map(header => escapeField(header, delimiter)).join(delimiter));

  for (const row of rows) {
    const csvRow = headers
      .map(header => sanitizeCell(row[header], options.preventCsvInjection))
      .map(value => escapeField(value, delimiter))
      .join(delimiter);
    allRows.push(csvRow);
  }

  return allRows.join('\n');
}
