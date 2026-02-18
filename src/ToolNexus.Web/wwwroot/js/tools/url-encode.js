export async function runTool(action, input) {
  if (action !== 'encode') {
    throw new Error(`Action '${action}' is not supported for client-side execution.`);
  }

  if (typeof input !== 'string') {
    return '';
  }

  return encodeURIComponent(input).replace(/[!'()*]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase();
  });
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['url-encode'] = { runTool };
