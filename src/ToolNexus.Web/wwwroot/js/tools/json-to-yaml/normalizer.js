import { MAX_SAFE_DEPTH } from './constants.js';
import { JsonYamlToolError } from './errors.js';
import { sortObjectKeys } from './utils.js';

export function normalizeInput(parsed, options) {
  const withSortedKeys = options.sortKeys ? sortObjectKeys(parsed) : parsed;
  ensureDepth(withSortedKeys, MAX_SAFE_DEPTH);
  return withSortedKeys;
}

function ensureDepth(root, maxDepth) {
  const stack = [{ value: root, depth: 0 }];

  while (stack.length > 0) {
    const current = stack.pop();

    if (current.depth > maxDepth) {
      throw new JsonYamlToolError(
        'TOO_DEEP',
        'Input depth exceeded',
        `JSON nesting is deeper than supported limit (${maxDepth}). Simplify the structure and retry.`
      );
    }

    if (Array.isArray(current.value)) {
      current.value.forEach(item => stack.push({ value: item, depth: current.depth + 1 }));
    } else if (current.value !== null && typeof current.value === 'object') {
      Object.values(current.value).forEach(item => stack.push({ value: item, depth: current.depth + 1 }));
    }
  }
}
