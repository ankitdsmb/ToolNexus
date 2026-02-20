import { createJsonToXmlApp } from './json-to-xml.app.js';
import { buildXml, getDefaultJsonToXmlOptions, JsonXmlError, parseJson, sanitizeTagName } from './json-to-xml.api.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'json-to-xml';

function resolveRoot() {
  return document.querySelector('.tool-page[data-slug="json-to-xml"]');
}

function readOptionsFromDocument() {
  const defaults = getDefaultJsonToXmlOptions();
  const indentSize = Number.parseInt(document.getElementById('jsonXmlIndentSize')?.value ?? String(defaults.indentSize), 10);

  return {
    rootName: sanitizeTagName(document.getElementById('jsonXmlRootName')?.value ?? defaults.rootName),
    prettyPrint: document.getElementById('jsonXmlPrettyPrint')?.checked ?? defaults.prettyPrint,
    indentSize: indentSize === 4 ? 4 : 2,
    autoRoot: document.getElementById('jsonXmlAutoRoot')?.checked ?? defaults.autoRoot,
    attributeMode: document.getElementById('jsonXmlAttributeMode')?.checked ?? defaults.attributeMode,
    nullMode: document.getElementById('jsonXmlNullMode')?.value === 'empty' ? 'empty' : 'self-closing'
  };
}

export function create(root = resolveRoot()) {
  if (!root) return null;

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => createJsonToXmlApp(root),
    destroy: (app) => app?.destroy?.()
  });
}

export function init(root = resolveRoot()) {
  const handle = create(root);
  if (!handle) return null;
  handle.init();
  return handle;
}

export function destroy(root = resolveRoot()) {
  if (!root) return;
  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}

export async function runTool(action, input, options = {}) {
  try {
    if ((action ?? '').toLowerCase() !== 'convert') {
      throw new JsonXmlError('Unsupported action', 'Only convert action is supported.');
    }

    const parsed = parseJson(input);
    const resolvedOptions = Object.keys(options).length > 0 ? options : readOptionsFromDocument();
    return buildXml(parsed, resolvedOptions);
  } catch (error) {
    throw new Error(error?.message ?? 'JSON to XML conversion failed');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules[TOOL_ID] = { runTool, create, init, destroy };
