export async function runTool(action, input) {
  if (action !== 'decode') {
    throw new Error(`Action '${action}' is not supported for client-side execution.`);
  }

  if (typeof input !== 'string') {
    return '';
  }

  try {
    return decodeURIComponent(input.replace(/\+/g, ' '));
  } catch (error) {
    if (error instanceof URIError) {
      throw new Error('Invalid URL encoding.');
    }
    throw error;
  }
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['url-decode'] = { runTool };
