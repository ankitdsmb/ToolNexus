import { formatScalar } from './scalars.js';
import { isPlainObject } from './utils.js';

function inlineScalar(value, options) {
  return formatScalar(value, options, 0);
}

function canRenderInlineArray(value) {
  return Array.isArray(value) && value.length <= 6 && value.every(item => item === null || ['string', 'number', 'boolean'].includes(typeof item));
}

function canRenderInlineObject(value) {
  return isPlainObject(value)
    && Object.keys(value).length <= 6
    && Object.values(value).every(item => item === null || ['string', 'number', 'boolean'].includes(typeof item));
}

function renderInlineValue(value, options) {
  if (Array.isArray(value)) {
    return `[${value.map(item => inlineScalar(item, options)).join(', ')}]`;
  }

  if (isPlainObject(value)) {
    return `{ ${Object.entries(value).map(([k, v]) => `${formatScalar(k, { ...options, quoteAllStrings: false }, 0)}: ${inlineScalar(v, options)}`).join(', ')} }`;
  }

  return inlineScalar(value, options);
}

export function convertJsonToYaml(value, options) {
  const lines = [];
  renderNode(value, 0, lines, options, true);
  return lines.join('\n');
}

function renderNode(node, depth, lines, options, isRoot = false) {
  const indent = options.indentUnit.repeat(depth);

  if (Array.isArray(node)) {
    if (node.length === 0) {
      lines.push(`${indent}[]`);
      return;
    }

    node.forEach(item => {
      if (Array.isArray(item) || isPlainObject(item)) {
        if (options.compact && (canRenderInlineArray(item) || canRenderInlineObject(item))) {
          lines.push(`${indent}- ${renderInlineValue(item, options)}`);
        } else {
          lines.push(`${indent}-`);
          renderNode(item, depth + 1, lines, options);
        }
      } else {
        lines.push(`${indent}- ${formatScalar(item, options, depth)}`);
      }
    });

    return;
  }

  if (isPlainObject(node)) {
    const entries = Object.entries(node);

    if (entries.length === 0) {
      lines.push(`${indent}{}`);
      return;
    }

    entries.forEach(([key, value]) => {
      const safeKey = formatScalar(key, { ...options, quoteAllStrings: false }, depth);

      if (Array.isArray(value) || isPlainObject(value)) {
        if (options.compact && (canRenderInlineArray(value) || canRenderInlineObject(value))) {
          lines.push(`${indent}${safeKey}: ${renderInlineValue(value, options)}`);
        } else {
          lines.push(`${indent}${safeKey}:`);
          renderNode(value, depth + 1, lines, options);
        }
      } else {
        lines.push(`${indent}${safeKey}: ${formatScalar(value, options, depth)}`);
      }
    });

    return;
  }

  if (isRoot) {
    lines.push(formatScalar(node, options, depth));
    return;
  }

  lines.push(`${indent}${formatScalar(node, options, depth)}`);
}
