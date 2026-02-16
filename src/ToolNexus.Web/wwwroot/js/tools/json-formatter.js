export async function runTool(action, input) {
  if (action === 'validate') {
    JSON.parse(input);
    return 'Valid JSON';
  }

  if (action === 'minify') {
    return JSON.stringify(JSON.parse(input));
  }

  if (action === 'to-csv') {
    const payload = JSON.parse(input);
    const rows = Array.isArray(payload) ? payload : [payload];
    const headers = [...new Set(rows.flatMap(r => Object.keys(r)))];
    const body = rows.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','));
    return [headers.join(','), ...body].join('\n');
  }

  return JSON.stringify(JSON.parse(input), null, 2);
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['json-formatter'] = { runTool };
