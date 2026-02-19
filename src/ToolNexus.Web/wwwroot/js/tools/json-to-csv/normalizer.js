import { ToolError } from './errors.js';

const DEFAULT_ARRAY_SEPARATOR = ', ';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stringifyValue(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  return JSON.stringify(value);
}

function normalizeArrayValue(arrayValue, options) {
  const { arrayMode, arraySeparator } = options;

  if (arrayMode === 'join') {
    return arrayValue.map(item => stringifyValue(item)).join(arraySeparator || DEFAULT_ARRAY_SEPARATOR);
  }

  return JSON.stringify(arrayValue);
}

function appendHeader(headers, headerSet, key) {
  if (key && !headerSet.has(key)) {
    headerSet.add(key);
    headers.push(key);
  }
}

function flattenIntoRow(targetRow, value, keyPath, options) {
  const { flattenNested, includeNulls } = options;

  if (value === null || value === undefined) {
    if (keyPath && includeNulls) {
      targetRow[keyPath] = 'null';
    }
    return;
  }

  if (Array.isArray(value)) {
    if (keyPath) {
      targetRow[keyPath] = normalizeArrayValue(value, options);
    }
    return;
  }

  if (isPlainObject(value)) {
    if (!flattenNested && keyPath) {
      targetRow[keyPath] = JSON.stringify(value);
      return;
    }

    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      const nextKeyPath = keyPath ? `${keyPath}.${nestedKey}` : nestedKey;
      flattenIntoRow(targetRow, nestedValue, nextKeyPath, options);
    }

    return;
  }

  if (keyPath) {
    targetRow[keyPath] = stringifyValue(value);
  }
}

export async function normalizeRows(rows, options) {
  if (!Array.isArray(rows)) {
    throw new ToolError(
      'NORMALIZE_INPUT_INVALID',
      'Normalization failed',
      'Expected rows to be an array during normalization.',
      'Retry conversion with valid JSON input.'
    );
  }

  const headers = [];
  const headerSet = new Set();
  const normalizedRows = new Array(rows.length);
  const chunkSize = 400;

  for (let index = 0; index < rows.length; index += 1) {
    if (index > 0 && index % chunkSize === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    const normalizedRow = {};
    flattenIntoRow(normalizedRow, rows[index], '', options);

    for (const key of Object.keys(normalizedRow)) {
      appendHeader(headers, headerSet, key);
    }

    normalizedRows[index] = normalizedRow;
  }

  return {
    headers,
    rows: normalizedRows
  };
}
