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
import { getToolPlatformKernel, resolveLifecycleInitRoot } from './tool-platform-kernel.js';
import { assertRunToolExecutionOnly } from './tool-lifecycle-guard.js';

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

export function init(...args) {
  const { lifecycleContext, root } = resolveLifecycleInitRoot(args);
  if (!(root instanceof Element)) {
    throw new Error('[Lifecycle] invalid root');
  }

  return {
    ...(typeof lifecycleContext === 'object' && lifecycleContext ? lifecycleContext : {}),
    root,
    handle: mountCsvToJson(root)
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

