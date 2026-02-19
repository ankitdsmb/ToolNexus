import { mountHtmlEntitiesTool, runConversion } from './html-entities/ui.js';

export async function runTool(action, input) {
  const normalizedAction = (action ?? '').toString().trim().toLowerCase();

  if (normalizedAction !== 'encode' && normalizedAction !== 'decode') {
    throw new Error(`Unsupported action "${action}" for html-entities.`);
  }

  return runConversion(normalizedAction, input, {
    encodeAll: false,
    unsafeOnly: true,
    preferNamed: true,
    numeric: false,
    hex: false,
    preserveFormatting: true
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountHtmlEntitiesTool, { once: true });
} else {
  mountHtmlEntitiesTool();
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['html-entities'] = { runTool };
