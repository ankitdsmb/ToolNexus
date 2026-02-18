import { minify } from 'https://cdn.jsdelivr.net/npm/terser/+esm';

export async function runTool(action, input) {
  try {
    if (action === 'minify') {
      const result = await minify(input, { sourceMap: false, mangle: true, compress: true });
      return result.code || input;
    }
    if (action === 'format') {
      const result = await minify(input, {
        format: {
          beautify: true,
          comments: true
        },
        compress: false,
        mangle: false,
        sourceMap: false
      });
      return result.code || input;
    }
  } catch (e) {
    console.error('JS Minifier error:', e);
    throw new Error(e.message || 'Minification failed');
  }
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['js-minifier'] = { runTool };
