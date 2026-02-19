const FORMULA_PREFIX = /^[=+\-@]/;

function sanitizeCellValue(value, preventCsvInjection) {
  const stringValue = value === null || value === undefined ? '' : String(value);
  if (!preventCsvInjection || !FORMULA_PREFIX.test(stringValue)) {
    return stringValue;
  }

  return `'${stringValue}`;
}

function escapeCsvField(value, delimiter) {
  const escapedValue = String(value).replaceAll('"', '""');
  const shouldQuote = escapedValue.includes(delimiter)
    || escapedValue.includes('"')
    || escapedValue.includes('\n')
    || escapedValue.includes('\r');

  return shouldQuote ? `"${escapedValue}"` : escapedValue;
}

export function buildCsv(headers, rows, options) {
  const delimiter = options.delimiter;
  const lines = new Array(rows.length + 1);

  lines[0] = headers.map(header => escapeCsvField(header, delimiter)).join(delimiter);

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    lines[index + 1] = headers
      .map(header => sanitizeCellValue(row[header] ?? '', options.preventCsvInjection))
      .map(field => escapeCsvField(field, delimiter))
      .join(delimiter);
  }

  return lines.join('\n');
}
