import { initializeUuidGeneratorUi } from './ui.js';
import { generateUuidByVersion } from './engine.js';
import { formatUuid } from './format.js';

export async function runTool(action, input) {
  if (action !== 'generate') {
    throw new Error(`Action '${action}' is not supported for client-side execution.`);
  }

  const count = Math.min(1000, Math.max(1, Number.parseInt(String(input ?? '').trim(), 10) || 1));
  const results = [];
  for (let index = 0; index < count; index += 1) {
    results.push(formatUuid(generateUuidByVersion('v4'), {
      caseMode: 'lower',
      removeHyphens: false,
      wrapper: 'none',
      customTemplate: ''
    }));
  }

  return results.join('\n');
}

document.addEventListener('DOMContentLoaded', initializeUuidGeneratorUi);

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['uuid-generator'] = { runTool };
