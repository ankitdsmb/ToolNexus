import { createUrlEncoderApp, runClientUrlEncode } from './url-encode.app.js';

export async function runTool(action, input, options = {}) {
  const normalizedAction = String(action ?? '').trim().toLowerCase();
  if (normalizedAction !== 'encode') {
    throw new Error(`Unsupported action "${action}" for url-encode.`);
  }

  return runClientUrlEncode(input, options);
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('.url-encode-tool');
  if (!root) {
    return;
  }

  createUrlEncoderApp(root);
});

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['url-encode'] = { runTool };
