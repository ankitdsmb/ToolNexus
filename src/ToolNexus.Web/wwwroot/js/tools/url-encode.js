export async function runTool(action, input) {
  const normalizedAction = (action ?? '').trim().toLowerCase();
  const source = (input ?? '').toString();

  if (normalizedAction !== 'encode') {
    throw new Error(`Unsupported action "${action}" for url-encode.`);
  }

  return encodeURIComponent(source).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['url-encode'] = { runTool };
