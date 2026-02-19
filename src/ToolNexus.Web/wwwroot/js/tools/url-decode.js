import { decodeUrlInput } from './url-decode/decoder.js';
import { mountUrlDecodeTool } from './url-decode/ui.js';

export async function runTool(action, input) {
  const normalizedAction = (action ?? '').trim().toLowerCase();
  if (normalizedAction !== 'decode') {
    throw new Error(`Unsupported action "${action}" for url-decode.`);
  }

  return decodeUrlInput(input, {
    plusAsSpace: false,
    strictMode: true
  }).output;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountUrlDecodeTool, { once: true });
} else {
  mountUrlDecodeTool();
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['url-decode'] = { runTool };
