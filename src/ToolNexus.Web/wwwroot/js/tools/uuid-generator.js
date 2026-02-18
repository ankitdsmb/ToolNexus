function parseCount(input) {
  if (!input) return 1;
  const str = input.toString().trim();
  if (!str) return 1;

  // check for count=N
  const match = str.match(/count\s*[=:]\s*(\d+)/i);
  if (match) {
    const val = parseInt(match[1], 10);
    return val > 0 ? val : 1;
  }

  // check for just N
  const val = parseInt(str, 10);
  if (!isNaN(val) && val > 0) {
    return val;
  }

  return 1;
}

export async function runTool(action, input) {
  if (action !== 'generate') {
    throw new Error(`Action '${action}' is not supported for client-side execution.`);
  }

  let count = parseCount(input);
  // Limit to 1000 to prevent browser hang
  if (count > 1000) count = 1000;

  const uuids = [];
  for (let i = 0; i < count; i++) {
    uuids.push(crypto.randomUUID());
  }

  return uuids.join('\n');
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['uuid-generator'] = { runTool };
