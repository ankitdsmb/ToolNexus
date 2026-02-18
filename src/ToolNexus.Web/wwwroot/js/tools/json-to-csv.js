export async function runTool(action, input) {
  if (action !== 'convert') {
     throw new Error(`Action '${action}' is not supported.`);
  }

  let data;
  try {
    data = JSON.parse(input);
  } catch (e) {
    throw new Error('Invalid JSON input.');
  }

  if (!Array.isArray(data)) {
    data = [data];
  }

  if (data.length === 0) {
    return '';
  }

  // 1. Get all unique headers
  const headers = new Set();
  data.forEach(obj => {
      if (typeof obj === 'object' && obj !== null) {
          Object.keys(obj).forEach(k => headers.add(k));
      }
  });

  let headerArray = Array.from(headers).sort();

  // Fallback for array of primitives
  if (headerArray.length === 0 && data.length > 0) {
       // treat as list of values
       headerArray = ['value'];
       return [
           'value',
           ...data.map(d => escapeCsvValue(d))
       ].join('\n');
  }

  // 2. Create CSV rows
  const csvRows = [];
  csvRows.push(headerArray.map(h => escapeCsvValue(h)).join(',')); // Header row

  data.forEach(obj => {
      const row = headerArray.map(header => {
          const val = (obj && obj[header] !== undefined) ? obj[header] : '';
          return escapeCsvValue(val);
      });
      csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

function escapeCsvValue(val) {
    if (val === null || val === undefined) return '';

    let stringVal;
    if (typeof val === 'object') {
        stringVal = JSON.stringify(val);
    } else {
        stringVal = String(val);
    }

    // Escape double quotes
    if (stringVal.includes('"')) {
        stringVal = stringVal.replace(/"/g, '""');
    }
    // Quote if contains comma, newline or double quote
    if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal}"`;
    }
    return stringVal;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['json-to-csv'] = { runTool };
