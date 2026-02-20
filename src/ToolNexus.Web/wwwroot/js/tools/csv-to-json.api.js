'use strict';

const DEFAULT_PREVIEW_ROWS = 50;
const CHUNK_SIZE = 2000;
const FORMULA_PREFIXES = new Set(['=', '+', '-', '@']);

class CsvParseError extends Error {
  constructor(message, row) {
    super(message);
    this.name = 'CsvParseError';
    this.row = row;
  }
}

const idle = () => new Promise((resolve) => setTimeout(resolve, 0));

function normalizeHeaders(rawHeaders) {
  const used = new Map();
  return rawHeaders.map((header, index) => {
    const base = String(header ?? '').trim() || `column_${index + 1}`;
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

function parseCustomHeaders(value) {
  if (!value.trim()) {
    return [];
  }

  return normalizeHeaders(value.split(',').map((header) => header.trim()));
}

function parseCsvRecords(input, delimiter) {
  if (typeof input !== 'string') {
    throw new CsvParseError('CSV input must be a string.', 1);
  }

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let rowIndex = 1;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (char === '"') {
      if (inQuotes && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(field);
      field = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && input[i + 1] === '\n') {
        i += 1;
      }

      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      rowIndex += 1;
      continue;
    }

    field += char;
  }

  if (inQuotes) {
    throw new CsvParseError('Unclosed quoted value detected.', rowIndex);
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function coerceValue(value, detectTypes, emptyAsNull, sanitizeFormulas) {
  const trimmed = String(value ?? '').trim();

  if (!trimmed) {
    return emptyAsNull ? null : '';
  }

  if (sanitizeFormulas && FORMULA_PREFIXES.has(trimmed[0])) {
    return `'${trimmed}`;
  }

  if (!detectTypes) {
    return trimmed;
  }

  if (/^(true|false)$/i.test(trimmed)) {
    return trimmed.toLowerCase() === 'true';
  }

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  return trimmed;
}

async function transformRowsToObjects(rows, options) {
  if (!rows.length) {
    return { records: [], headers: [] };
  }

  const sourceHeaders = options.useHeaderRow
    ? rows[0]
    : (options.customHeaders.length ? options.customHeaders : rows[0].map((_, index) => `column_${index + 1}`));

  const headers = normalizeHeaders(sourceHeaders);
  const dataStart = options.useHeaderRow ? 1 : 0;
  const records = [];

  for (let i = dataStart; i < rows.length; i += 1) {
    const sourceRow = rows[i];
    const record = {};

    for (let h = 0; h < headers.length; h += 1) {
      const rawValue = sourceRow[h] ?? '';
      record[headers[h]] = coerceValue(rawValue, options.typeDetection, options.emptyAsNull, options.sanitizeFormulas);
    }

    records.push(record);

    if (i % CHUNK_SIZE === 0) {
      await idle();
    }
  }

  return { records, headers };
}

function formatError(error) {
  if (error instanceof CsvParseError) {
    return `CSV Parsing Error\n${error.message}\nApproximate row: ${error.row}`;
  }

  return `Conversion Error\n${error?.message || 'Unable to convert CSV input.'}`;
}

async function convertCsvToJson(input, config) {
  const rows = parseCsvRecords(input, config.delimiter);
  const { records, headers } = await transformRowsToObjects(rows, config);

  const previewSize = Number.isFinite(config.previewRows) ? Math.max(1, config.previewRows) : DEFAULT_PREVIEW_ROWS;
  const previewRecords = records.slice(0, previewSize);

  return {
    allRecords: records,
    previewRecords,
    headers,
    rowCount: records.length,
    json: JSON.stringify(previewRecords, null, config.pretty ? config.indent : 0)
  };
}

async function runTool(action, input) {
  if (action !== 'convert') {
    throw new Error(`Unsupported action: ${action}`);
  }

  const result = await convertCsvToJson(input, {
    delimiter: ',',
    useHeaderRow: true,
    customHeaders: [],
    pretty: true,
    indent: 2,
    typeDetection: true,
    emptyAsNull: true,
    sanitizeFormulas: false,
    previewRows: Number.MAX_SAFE_INTEGER
  });

  return JSON.stringify(result.allRecords, null, 2);
}

export {
  CsvParseError,
  DEFAULT_PREVIEW_ROWS,
  coerceValue,
  convertCsvToJson,
  formatError,
  normalizeHeaders,
  parseCsvRecords,
  parseCustomHeaders,
  runTool,
  transformRowsToObjects
};
