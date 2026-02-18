export async function runTool(action, input) {
  const normalizedAction = (action ?? '').trim().toLowerCase();
  const source = (input ?? '').toString();

  if (normalizedAction !== 'decode') {
    throw new Error(`Unsupported action "${action}" for url-decode.`);
  }

  try {
    return decodeURIComponent(source);
  } catch {
    throw new Error('Invalid URL-encoded input. Please verify the text and try again.');
  }
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['url-decode'] = { runTool };
