export async function runTool(action, input) {
  if (action === 'convert') {
    try {
      const obj = JSON.parse(input);
      return jsonToYaml(obj);
    } catch (error) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
  }
  return input;
}

function jsonToYaml(obj, indent = 0) {
  const spacing = ' '.repeat(indent);

  if (obj === null) return 'null';
  if (obj === undefined) return '';

  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      if (/^[a-zA-Z0-9_]+$/.test(obj) && !['true', 'false', 'null'].includes(obj.toLowerCase())) {
        return obj;
      }
      return JSON.stringify(obj);
    }
    return String(obj);
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj.map(item => {
        let itemYaml = jsonToYaml(item, indent + 2);

        if (typeof item === 'object' && item !== null && !Array.isArray(item) && Object.keys(item).length > 0) {
           const objectLines = itemYaml.split('\n');
           const firstLine = objectLines[0].trimStart();
           const rest = objectLines.slice(1);
           if (rest.length > 0) {
              return `${spacing}- ${firstLine}\n${rest.join('\n')}`;
           }
           return `${spacing}- ${firstLine}`;
        }

        return `${spacing}- ${itemYaml.trimStart()}`;

    }).join('\n');
  }

  const keys = Object.keys(obj);
  if (keys.length === 0) return '{}';

  return keys.map(key => {
    const value = obj[key];
    const keyStr = /^[a-zA-Z0-9_]+$/.test(key) ? key : JSON.stringify(key);

    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value) && value.length === 0) {
        return `${spacing}${keyStr}: []`;
      }
      if (!Array.isArray(value) && Object.keys(value).length === 0) {
        return `${spacing}${keyStr}: {}`;
      }
      return `${spacing}${keyStr}:\n${jsonToYaml(value, indent + 2)}`;
    }

    return `${spacing}${keyStr}: ${jsonToYaml(value)}`;
  }).join('\n');
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['json-to-yaml'] = { runTool };
