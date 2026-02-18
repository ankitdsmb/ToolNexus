function sanitizeTagName(name) {
  // XML tags must start with letter or underscore, and contain only letters, digits, underscores, hyphens, periods.
  // We'll replace invalid characters with underscores.
  let safeName = name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  if (!/^[a-zA-Z_]/.test(safeName)) {
    safeName = '_' + safeName;
  }
  return safeName;
}

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function convertToXml(obj, tagName) {
  if (obj === null || obj === undefined) {
    return `<${tagName} />`;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertToXml(item, tagName)).join('');
  }

  if (typeof obj === 'object') {
    let content = '';
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const safeKey = sanitizeTagName(key);
        const value = obj[key];

        // Handling arrays as children
        if (Array.isArray(value)) {
           // For {list: [1,2]}, we want <list>1</list><list>2</list>
           // convertToXml(value, safeKey) handles array iteration
           content += convertToXml(value, safeKey);
        } else {
           content += convertToXml(value, safeKey);
        }
      }
    }
    return `<${tagName}>${content}</${tagName}>`;
  }

  // Primitive value
  return `<${tagName}>${escapeXml(obj)}</${tagName}>`;
}

export async function runTool(action, input) {
  if (action !== 'convert') {
    throw new Error(`Action '${action}' is not supported for client-side execution.`);
  }

  let json;
  try {
    json = JSON.parse(input);
  } catch (e) {
    throw new Error('Invalid JSON input.');
  }

  let xmlContent = '';

  if (Array.isArray(json)) {
    xmlContent = json.map(item => convertToXml(item, 'item')).join('');
  } else if (typeof json === 'object' && json !== null) {
    for (const key in json) {
       if (Object.prototype.hasOwnProperty.call(json, key)) {
          const safeKey = sanitizeTagName(key);
          xmlContent += convertToXml(json[key], safeKey);
       }
    }
  } else {
    // Primitive root
    xmlContent = escapeXml(json);
  }

  return `<root>${xmlContent}</root>`;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['json-to-xml'] = { runTool };
