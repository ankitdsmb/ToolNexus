function resolvePath(source, path) {
  if (!source || !path) {
    return '';
  }

  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) {
      return undefined;
    }

    return current[key];
  }, source);
}

function toStringValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return typeof value === 'string' ? value : String(value);
}

export function bindTemplateData(root, config) {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return;
  }

  const bindings = root.querySelectorAll('[data-bind]');
  for (const element of bindings) {
    try {
      const path = (element.getAttribute('data-bind') || '').trim();
      const value = toStringValue(resolvePath(config, path));

      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.value = value;
      } else {
        element.textContent = value;
      }
    } catch {
      // binding should never break runtime
    }
  }
}
