export async function runTool(action, input) {
  if (!input) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'text/html');
  // Convert and then collapse multiple newlines (3 or more) into 2
  return convertNode(doc.body, undefined).trim().replace(/\n{3,}/g, '\n\n');
}

function convertNode(node, context = { listDepth: 0, listType: null, listIndex: 0 }) {
  if (node.nodeType === Node.TEXT_NODE) {
    // Simple text handling. In a robust converter, we'd escape markdown chars.
    // Replace sequences of whitespace including newlines with a single space
    return node.textContent.replace(/\s+/g, ' ');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const tagName = node.tagName.toUpperCase();
  let content = '';

  // Process children
  if (tagName === 'PRE') {
    // For PRE, we want to preserve whitespace, so we just take textContent directly?
    // But what if PRE contains other tags? Usually it shouldn't in markdown mapping.
    // Let's stick to textContent for simplicity as converting child tags inside PRE is weird in MD.
    content = node.textContent;
  } else {
    // For lists, we need to pass context
    let childContext = { ...context };
    if (tagName === 'UL' || tagName === 'OL') {
        childContext.listDepth++;
        childContext.listType = tagName;
        childContext.listIndex = 0;
    }

    for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (tagName === 'OL' && child.tagName === 'LI') {
            childContext.listIndex++;
        }
        content += convertNode(child, childContext);
    }
  }

  // Wrap content based on tag
  switch (tagName) {
    case 'H1': return `\n# ${content}\n`;
    case 'H2': return `\n## ${content}\n`;
    case 'H3': return `\n### ${content}\n`;
    case 'H4': return `\n#### ${content}\n`;
    case 'H5': return `\n##### ${content}\n`;
    case 'H6': return `\n###### ${content}\n`;

    // Paragraphs should have blank lines around them
    case 'P': return `\n\n${content}\n\n`;

    case 'STRONG':
    case 'B': return `**${content}**`;

    case 'EM':
    case 'I': return `*${content}*`;

    case 'A':
      const href = node.getAttribute('href') || '';
      const title = node.getAttribute('title');
      return `[${content}](${href}${title ? ` "${title}"` : ''})`;

    case 'IMG':
      const src = node.getAttribute('src') || '';
      const alt = node.getAttribute('alt') || '';
      return `![${alt}](${src})`;

    case 'UL':
    case 'OL': return `\n${content}\n`;

    case 'LI':
        const indent = '  '.repeat(Math.max(0, context.listDepth - 1));
        const marker = context.listType === 'OL' ? `${context.listIndex}. ` : '- ';
        // Trim content to avoid extra spaces inside list item
        return `${indent}${marker}${content.trim()}\n`;

    case 'BLOCKQUOTE': return `\n> ${content.trim()}\n`;

    case 'CODE': return `\`${content}\``;

    case 'PRE': return `\n\`\`\`\n${content}\n\`\`\`\n`;

    case 'HR': return '\n---\n';

    case 'BR': return '  \n';

    case 'BODY': return content;

    default: return content;
  }
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['html-to-markdown'] = { runTool };
