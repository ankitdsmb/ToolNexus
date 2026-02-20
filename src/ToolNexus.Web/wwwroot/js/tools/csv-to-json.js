import {
  CsvParseError,
  coerceValue,
  convertCsvToJson,
  formatError,
  normalizeHeaders,
  parseCsvRecords,
  parseCustomHeaders,
  runTool,
  transformRowsToObjects
} from './csv-to-json.api.js';
import { createCsvToJsonApp, TOOL_ID } from './csv-to-json.app.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const MODULE_KEY = 'csv-to-json';

export {
  CsvParseError,
  coerceValue,
  convertCsvToJson,
  formatError,
  normalizeHeaders,
  parseCsvRecords,
  parseCustomHeaders,
  runTool,
  transformRowsToObjects
};

export function create(root) {
  return { root, handle: null };
}

export function init(context) {
  if (!context?.root) {
    return context ?? null;
  }

  return {
    ...context,
    handle: mountCsvToJson(context.root)
  };
}

export function destroy(context) {
  context?.handle?.destroy?.();
}

export function mountCsvToJson(root) {
  if (!root) {
    return null;
  }

  return getToolPlatformKernel().mountTool({
    id: TOOL_ID,
    root,
    init: () => createCsvToJsonApp(root),
    destroy: (app) => app?.destroy?.()
  });
}

export function initCsvToJsonApp(doc = document) {
  const root = doc.querySelector('[data-tool="csv-to-json"], .csv-json-page');
  if (!root) {
    return null;
  }

  return mountCsvToJson(root);
}

export function destroyCsvToJsonApp(doc = document) {
  const root = doc.querySelector('[data-tool="csv-to-json"], .csv-json-page');
  if (!root) {
    return;
  }

  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initCsvToJsonApp(document), { once: true });
  } else {
    initCsvToJsonApp(document);
  }
}

if (typeof window !== 'undefined') {
  window.ToolNexusModules = window.ToolNexusModules || {};
  window.ToolNexusModules[MODULE_KEY] = { create, init, runTool, destroy, initCsvToJsonApp, destroyCsvToJsonApp };
}
