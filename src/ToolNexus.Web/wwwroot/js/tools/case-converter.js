export async function runTool(action, input) {
  if (!input) return '';

  const normalizedAction = (action || '').toLowerCase();

  if (normalizedAction === 'upper') {
    return input.toUpperCase();
  }

  if (normalizedAction === 'lower') {
    return input.toLowerCase();
  }

  if (normalizedAction === 'title') {
    // Matches server-side behavior: ToLowerInvariant() then ToTitleCase()
    // Using regex to capitalize the first letter of each word boundary.
    return input.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
  }

  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['case-converter'] = { runTool };
