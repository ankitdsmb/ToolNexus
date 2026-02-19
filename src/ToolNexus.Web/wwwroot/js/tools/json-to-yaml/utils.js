export function getLineColumn(text, position) {
  const safePosition = Math.max(0, Math.min(position, text.length));
  let line = 1;
  let column = 1;

  for (let i = 0; i < safePosition; i += 1) {
    if (text[i] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column };
}

export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function delayFrame() {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

export function countJsonNodes(root) {
  const stack = [root];
  let objects = 0;
  let arrays = 0;
  let primitives = 0;

  while (stack.length > 0) {
    const current = stack.pop();

    if (Array.isArray(current)) {
      arrays += 1;
      for (let i = current.length - 1; i >= 0; i -= 1) {
        stack.push(current[i]);
      }
      continue;
    }

    if (isPlainObject(current)) {
      objects += 1;
      const entries = Object.values(current);
      for (let i = entries.length - 1; i >= 0; i -= 1) {
        stack.push(entries[i]);
      }
      continue;
    }

    primitives += 1;
  }

  return { objects, arrays, primitives };
}

export function sortObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const sorted = {};
  Object.keys(value)
    .sort((a, b) => a.localeCompare(b))
    .forEach(key => {
      sorted[key] = sortObjectKeys(value[key]);
    });

  return sorted;
}
