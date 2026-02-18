function formatXml(input) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'application/xml');
  checkForErrors(doc);

  function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&'"]/g, function (c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  function serialize(node, level) {
    const indent = '  '.repeat(level);
    let output = '';

    switch (node.nodeType) {
      case Node.ELEMENT_NODE:
        output += indent + '<' + node.tagName;
        for (let i = 0; i < node.attributes.length; i++) {
          const attr = node.attributes[i];
          output += ` ${attr.name}="${escapeXml(attr.value)}"`;
        }

        const children = Array.from(node.childNodes).filter(
          n => n.nodeType !== Node.TEXT_NODE || n.nodeValue.trim().length > 0
        );

        if (children.length === 0) {
          output += '/>';
        } else {
          const hasElementChildren = children.some(n => n.nodeType === Node.ELEMENT_NODE);

          if (!hasElementChildren) {
             let textContent = '';
             children.forEach(child => {
                 if (child.nodeType === Node.TEXT_NODE) textContent += escapeXml(child.nodeValue);
                 else if (child.nodeType === Node.CDATA_SECTION_NODE) textContent += `<![CDATA[${child.nodeValue}]]>`;
                 else if (child.nodeType === Node.COMMENT_NODE) textContent += `<!--${child.nodeValue}-->`;
             });
             output += `>${textContent}</${node.tagName}>`;
          } else {
             output += '>\n';
             children.forEach(child => {
                output += serialize(child, level + 1);
             });
             output += indent + `</${node.tagName}>`;
          }
        }
        output += '\n';
        break;

      case Node.TEXT_NODE:
        const text = node.nodeValue.trim();
        if (text) output += indent + escapeXml(text) + '\n';
        break;

      case Node.CDATA_SECTION_NODE:
        output += indent + `<![CDATA[${node.nodeValue}]]>\n`;
        break;

      case Node.COMMENT_NODE:
        output += indent + `<!--${node.nodeValue}-->\n`;
        break;

      case Node.PROCESSING_INSTRUCTION_NODE:
        output += indent + `<?${node.target} ${node.data}?>\n`;
        break;

      case Node.DOCUMENT_TYPE_NODE:
        output += `<!DOCTYPE ${node.name}`;
        if (node.publicId) {
             output += ` PUBLIC "${node.publicId}"`;
             if (node.systemId) output += ` "${node.systemId}"`;
        } else if (node.systemId) {
             output += ` SYSTEM "${node.systemId}"`;
        }
        output += '>\n';
        break;

      case Node.DOCUMENT_NODE:
        for (let i = 0; i < node.childNodes.length; i++) {
           output += serialize(node.childNodes[i], level);
        }
        break;
    }

    return output;
  }

  return serialize(doc, 0).trim();
}

function minifyXml(input) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'application/xml');
  checkForErrors(doc);

  function clean(node) {
    for (let n = 0; n < node.childNodes.length; n++) {
      const child = node.childNodes[n];
      if (child.nodeType === Node.TEXT_NODE && !child.nodeValue.trim()) {
        node.removeChild(child);
        n--;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        clean(child);
      }
    }
  }

  clean(doc);
  return new XMLSerializer().serializeToString(doc);
}

function validateXml(input) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'application/xml');
  checkForErrors(doc);
  return 'Valid XML';
}

function checkForErrors(doc) {
  const errorNode = doc.querySelector('parsererror');
  if (errorNode) {
    throw new Error(errorNode.textContent || 'XML Parsing Error');
  }
}

export async function runTool(action, input) {
  switch (action) {
    case 'format':
      return formatXml(input);
    case 'minify':
      return minifyXml(input);
    case 'validate':
      return validateXml(input);
    default:
      throw new Error(`Action '${action}' is not supported client-side.`);
  }
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['xml-formatter'] = { runTool };
