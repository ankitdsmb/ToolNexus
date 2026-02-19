function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function primitiveToString(value, includeNulls) {
  if (value === null || value === undefined) {
    return includeNulls ? 'null' : '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

function flattenInto(target, value, keyPath, options) {
  const { flattenNested, includeNulls } = options;

  if (value === null || value === undefined) {
    if (keyPath) {
      target[keyPath] = includeNulls ? 'null' : '';
    }
    return;
  }

  if (Array.isArray(value)) {
    if (keyPath) {
      target[keyPath] = JSON.stringify(value);
    }
    return;
  }

  if (isPlainObject(value)) {
    if (!flattenNested && keyPath) {
      target[keyPath] = JSON.stringify(value);
      return;
    }

    for (const [key, nestedValue] of Object.entries(value)) {
      const nextPath = keyPath ? `${keyPath}.${key}` : key;
      flattenInto(target, nestedValue, nextPath, options);
    }
    return;
  }

  if (keyPath) {
    target[keyPath] = primitiveToString(value, includeNulls);
  }
}

export async function normalizeRows(rows, options) {
  const headerOrder = [];
  const headerSet = new Set();
  const normalizedRows = [];
  const chunkSize = 500;

  for (let i = 0; i < rows.length; i += 1) {
    if (i > 0 && i % chunkSize === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    const normalized = {};
    flattenInto(normalized, rows[i], '', options);

    for (const key of Object.keys(normalized)) {
      if (!headerSet.has(key)) {
        headerSet.add(key);
        headerOrder.push(key);
      }
    }

    normalizedRows.push(normalized);
  }

  for (const row of normalizedRows) {
    for (const header of headerOrder) {
      if (!(header in row)) {
        row[header] = '';
      }
    }
  }

  return {
    headers: headerOrder,
    rows: normalizedRows
  };
}
