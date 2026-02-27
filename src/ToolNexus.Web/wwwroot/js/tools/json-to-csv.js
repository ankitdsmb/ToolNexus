import { parseJsonInput } from './json-to-csv/parser.js';
import { normalizeRows } from './json-to-csv/normalizer.js';
import { buildCsv } from './json-to-csv/csv-engine.js';
import { toUserError } from './json-to-csv/errors.js';
import { mountJsonToCsvTool } from './json-to-csv/ui.js';
import { getToolPlatformKernel, normalizeToolRoot } from './tool-platform-kernel.js';
import { assertRunToolExecutionOnly } from './tool-lifecycle-guard.js';

const TOOL_ID = 'json-to-csv';

const DELIMITER_MAP = {
  comma: ',',
  semicolon: ';',
  tab: '\t'
};

function resolveRoot(context) {
  if (context?.handle?.id === TOOL_ID && context.handle?.root instanceof Element) {
    return context.handle.root;
  }

  return normalizeToolRoot(context);
}

function requireRuntimeRoot(context) {
  const root = resolveRoot(context);
  if (!root) {
    throw new Error(`[${TOOL_ID}] invalid lifecycle root`);
  }

  return root;
}

function resolveOptions(options = {}) {
  return {
    delimiter: DELIMITER_MAP[options.delimiter] || options.delimiter || ',',
    flattenNested: options.flattenNested ?? true,
    includeNulls: options.includeNulls ?? false,
    preventCsvInjection: options.preventCsvInjection ?? true,
    arrayMode: options.arrayMode ?? 'stringify',
    arraySeparator: options.arraySeparator ?? ', '
  };
}

export function create(context) {
  const root = requireRuntimeRoot(context);
  if (!root) return null;

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => mountJsonToCsvTool(root),
    destroy: (app) => app?.destroy?.()
  });
}

export function init(context) {
  const root = requireRuntimeRoot(context);
  const handle = create(root);
  if (!handle) return null;
  handle.init();
  return handle;
}

export function destroy(context) {
  const root = requireRuntimeRoot(context);
  if (!root) return;
  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}

export async function runTool(action, input, options = {}) {
  assertRunToolExecutionOnly(TOOL_ID, action, input, options);
  if (action !== 'convert' && action !== 'validate') {
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ACTION',
        message: `Unknown action: ${action}`
      }
    };
  }

  try {
    const parsedRows = parseJsonInput(input);

    if (action === 'validate') {
      return {
        success: true,
        data: null,
        metadata: {
          valid: true,
          rowCount: parsedRows.length
        }
      };
    }

    const config = resolveOptions(options);
    const normalized = await normalizeRows(parsedRows, config);
    const csv = buildCsv(normalized.headers, normalized.rows, config);

    return {
      success: true,
      data: csv,
      metadata: {
        rowCount: normalized.rows.length,
        columnCount: normalized.headers.length
      }
    };
  } catch (error) {
    const friendly = toUserError(error);
    return {
      success: false,
      error: {
        code: friendly.code,
        message: friendly.message,
        details: friendly.details
      }
    };
  }
}

runTool.configure = (defaults = {}) => (action, input, options = {}) => runTool(action, input, { ...defaults, ...options });


