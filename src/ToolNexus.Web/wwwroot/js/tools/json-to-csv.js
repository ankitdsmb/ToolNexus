class JSONToCSVError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'JSONToCSVError';
    this.code = code;
    this.details = details;
  }
}

function extractHeaders(data, flattenObjects = true, keySet = new Set()) {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  data.forEach(item => {
    if (typeof item !== 'object' || item === null) return;

    Object.keys(item).forEach(key => {
      const value = item[key];

      if (flattenObjects && value && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively extract nested keys with dot notation
        const nestedKeys = extractHeaders([value], true, new Set());
        nestedKeys.forEach(nestedKey => {
          keySet.add(`${key}.${nestedKey}`);
        });
      } else {
        keySet.add(key);
      }
    });
  });

  return Array.from(keySet).sort();
}

function flattenObject(obj, prefix = '') {
  if (!obj || typeof obj !== 'object') return { [prefix]: obj };
  if (Array.isArray(obj)) {
    return { [prefix]: JSON.stringify(obj) }; // Handle arrays as JSON strings
  }

  return Object.keys(obj).reduce((acc, key) => {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(acc, flattenObject(value, newKey));
    } else {
      acc[newKey] = value;
    }

    return acc;
  }, {});
}

function escapeCSVField(value, delimiter, quoteChar, nullPlaceholder) {
  if (value === null || value === undefined) {
    return nullPlaceholder;
  }

  const stringValue = String(value);

  // Check if field needs quoting (contains delimiter, quote, newlines, or leading/trailing whitespace)
  const needsQuoting = stringValue.includes(delimiter) ||
    stringValue.includes(quoteChar) ||
    stringValue.includes('\n') ||
    stringValue.includes('\r') ||
    stringValue.match(/^\s|\s$/);

  if (needsQuoting) {
    // Escape quotes by doubling them (standard CSV escaping)
    const escapedValue = stringValue.replace(new RegExp(quoteChar, 'g'), quoteChar + quoteChar);
    return `${quoteChar}${escapedValue}${quoteChar}`;
  }

  return stringValue;
}

function convertJSONToCSV(jsonData, options = {}) {
  // Validate input
  if (!jsonData) {
    throw new JSONToCSVError('Input data is required', 'EMPTY_INPUT');
  }

  if (!Array.isArray(jsonData)) {
    // Attempt to convert single object to array
    if (typeof jsonData === 'object' && jsonData !== null) {
      jsonData = [jsonData];
    } else {
      throw new JSONToCSVError('Input must be an array of objects', 'INVALID_INPUT_TYPE', {
        receivedType: typeof jsonData
      });
    }
  }

  if (jsonData.length === 0) {
    return ''; // Return empty string for empty array
  }

  // Merge options with defaults
  const config = {
    includeHeaders: true,
    delimiter: ',',
    quoteChar: '"',
    flattenObjects: true,
    nullPlaceholder: '',
    preserveOrder: true,
    maxRows: Infinity,
    ...options
  };

  try {
    // Limit rows if specified
    const dataToProcess = jsonData.slice(0, config.maxRows);

    // Extract headers
    let headers;
    if (config.preserveOrder && dataToProcess[0]) {
      // Use first object's keys as base order, then add any additional keys
      const baseKeys = Object.keys(dataToProcess[0]);
      const allKeys = extractHeaders(dataToProcess, config.flattenObjects);
      headers = [...new Set([...baseKeys, ...allKeys])];
    } else {
      headers = extractHeaders(dataToProcess, config.flattenObjects);
    }

    // Build CSV rows
    const rows = [];

    // Add headers if requested
    if (config.includeHeaders) {
      rows.push(headers.map(header =>
        escapeCSVField(header, config.delimiter, config.quoteChar, config.nullPlaceholder)
      ).join(config.delimiter));
    }

    // Process each row
    dataToProcess.forEach((item, index) => {
      try {
        let flattenedItem = config.flattenObjects ? flattenObject(item) : item;

        const row = headers.map(header => {
          const value = flattenedItem[header];
          return escapeCSVField(value, config.delimiter, config.quoteChar, config.nullPlaceholder);
        });

        rows.push(row.join(config.delimiter));
      } catch (rowError) {
        console.warn(`Error processing row ${index}:`, rowError);
        // Add empty row as fallback
        rows.push(headers.map(() => config.nullPlaceholder).join(config.delimiter));
      }
    });

    return rows.join('\n');
  } catch (error) {
    throw new JSONToCSVError(
      `Conversion failed: ${error.message}`,
      'CONVERSION_FAILED',
      { originalError: error }
    );
  }
}

function validateAndParseJSON(input) {
  if (!input || typeof input !== 'string') {
    throw new JSONToCSVError('Input must be a non-empty string', 'INVALID_INPUT');
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new JSONToCSVError('Input cannot be empty', 'EMPTY_STRING');
  }

  try {
    const parsed = JSON.parse(trimmed);

    // Handle various JSON structures
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return []; // Valid empty array
      }

      // Check if array contains objects
      const hasNonObject = parsed.some(item =>
        typeof item !== 'object' || item === null
      );

      if (hasNonObject) {
        throw new JSONToCSVError(
          'Array must contain only objects',
          'INVALID_ARRAY_CONTENT',
          { sample: parsed.slice(0, 3) }
        );
      }

      return parsed;
    }

    if (typeof parsed === 'object' && parsed !== null) {
      // Single object - wrap in array
      return [parsed];
    }

    throw new JSONToCSVError(
      'Input must be an object or array of objects',
      'INVALID_JSON_STRUCTURE',
      { receivedType: typeof parsed }
    );
  } catch (error) {
    if (error instanceof JSONToCSVError) {
      throw error;
    }

    // Provide helpful parsing error messages
    const position = error.message.match(/position (\d+)/);
    const errorContext = position ?
      ` at position ${position[1]}: "${trimmed.slice(Math.max(0, position[1] - 20), Math.min(trimmed.length, position[1] + 20))}"` :
      '';

    throw new JSONToCSVError(
      `Invalid JSON format${errorContext}: ${error.message}`,
      'PARSE_ERROR',
      { originalError: error }
    );
  }
}

export async function runTool(action, input, options = {}) {
  // Handle different actions
  switch (action) {
    case 'convert':
      try {
        // Parse and validate JSON
        const jsonData = validateAndParseJSON(input);

        // Convert to CSV
        const csv = convertJSONToCSV(jsonData, options);

        // Detect if this is a large dataset for performance hint
        const isLargeDataset = jsonData.length > 1000;

        return {
          success: true,
          data: csv,
          metadata: {
            rowCount: jsonData.length,
            columnCount: csv ? csv.split('\n')[0].split(options.delimiter || ',').length : 0,
            isLargeDataset,
            warnings: isLargeDataset ? ['Large dataset detected. Performance may vary.'] : []
          }
        };
      } catch (error) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.code || 'UNKNOWN_ERROR',
            details: error.details || {}
          }
        };
      }

    case 'validate':
      // Validate-only mode
      try {
        const jsonData = validateAndParseJSON(input);
        return {
          success: true,
          data: null,
          metadata: {
            valid: true,
            rowCount: jsonData.length,
            structure: Array.isArray(jsonData) ? 'array' : 'object'
          }
        };
      } catch (error) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.code || 'VALIDATION_ERROR',
            details: error.details || {}
          }
        };
      }

    default:
      return {
        success: false,
        error: {
          message: `Unknown action: ${action}`,
          code: 'UNKNOWN_ACTION'
        }
      };
  }
}

runTool.configure = (defaultOptions = {}) => {
  return (action, input, options = {}) =>
    runTool(action, input, { ...defaultOptions, ...options });
};

runTool.downloadCSV = (csvContent, filename = 'data.csv') => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['json-to-csv'] = {
  runTool,
  utils: {
    convertJSONToCSV,
    validateAndParseJSON,
    flattenObject,
    extractHeaders
  }
};
