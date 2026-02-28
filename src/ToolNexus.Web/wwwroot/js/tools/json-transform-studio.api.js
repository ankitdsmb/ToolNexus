const ACTIONS = Object.freeze({
  FORMAT: 'format',
  MINIFY: 'minify',
  FLATTEN: 'flatten',
  EXTRACT_KEYS: 'extract-keys',
  FILTER_PATHS: 'filter-paths'
});

const MAX_NODES = 250000;

function sortValueDeterministic(value) {
  if (Array.isArray(value)) {
    return value.map(sortValueDeterministic);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        acc[key] = sortValueDeterministic(value[key]);
        return acc;
      }, {});
  }

  return value;
}

function parseJson(input) {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (error) {
    return {
      ok: false,
      error: {
        title: 'Invalid JSON input',
        message: error?.message || 'Unable to parse JSON input.'
      }
    };
  }
}

function flattenJson(value) {
  const flattened = {};
  const stack = [{ path: '$', value }];
  let visited = 0;

  while (stack.length > 0) {
    const current = stack.pop();
    visited += 1;
    if (visited > MAX_NODES) {
      throw new Error(`Flatten aborted: exceeded ${MAX_NODES.toLocaleString()} nodes.`);
    }

    const currentValue = current.value;

    if (Array.isArray(currentValue)) {
      if (currentValue.length === 0) {
        flattened[current.path] = [];
      }

      for (let index = currentValue.length - 1; index >= 0; index -= 1) {
        stack.push({ path: `${current.path}[${index}]`, value: currentValue[index] });
      }
      continue;
    }

    if (currentValue && typeof currentValue === 'object') {
      const keys = Object.keys(currentValue).sort((a, b) => a.localeCompare(b));
      if (keys.length === 0) {
        flattened[current.path] = {};
      }

      for (let idx = keys.length - 1; idx >= 0; idx -= 1) {
        const key = keys[idx];
        stack.push({ path: `${current.path}.${key}`, value: currentValue[key] });
      }
      continue;
    }

    flattened[current.path] = currentValue;
  }

  return flattened;
}

function extractKeys(value) {
  const keys = new Set();
  const stack = [value];
  let visited = 0;

  while (stack.length) {
    const current = stack.pop();
    visited += 1;
    if (visited > MAX_NODES) {
      throw new Error(`Key extraction aborted: exceeded ${MAX_NODES.toLocaleString()} nodes.`);
    }

    if (Array.isArray(current)) {
      for (let i = current.length - 1; i >= 0; i -= 1) {
        stack.push(current[i]);
      }
      continue;
    }

    if (current && typeof current === 'object') {
      const objectKeys = Object.keys(current);
      for (let i = objectKeys.length - 1; i >= 0; i -= 1) {
        const key = objectKeys[i];
        keys.add(key);
        stack.push(current[key]);
      }
    }
  }

  return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

function resolvePath(value, pathExpression) {
  if (!pathExpression || pathExpression === '$') {
    return { found: true, value };
  }

  const tokens = pathExpression
    .replace(/^\$\.?/, '')
    .split('.')
    .filter(Boolean)
    .flatMap((segment) => {
      const parts = [];
      const matcher = /([^\[\]]+)|\[(\d+)\]/g;
      let match = matcher.exec(segment);
      while (match) {
        if (match[1]) {
          parts.push(match[1]);
        }
        if (match[2]) {
          parts.push(Number.parseInt(match[2], 10));
        }
        match = matcher.exec(segment);
      }
      return parts;
    });

  let current = value;
  for (const token of tokens) {
    if (current === null || current === undefined) {
      return { found: false, value: undefined };
    }

    if (typeof token === 'number') {
      if (!Array.isArray(current) || token >= current.length) {
        return { found: false, value: undefined };
      }
      current = current[token];
      continue;
    }

    if (typeof current !== 'object' || !(token in current)) {
      return { found: false, value: undefined };
    }

    current = current[token];
  }

  return { found: true, value: current };
}

function filterPaths(value, rawFilter) {
  const paths = (rawFilter || '')
    .split('\n')
    .map((line) => line.trim())
    .flatMap((line) => line.split(','))
    .map((path) => path.trim())
    .filter(Boolean);

  if (!paths.length) {
    throw new Error('Filter Paths requires at least one path. Example: $.items[0].id');
  }

  const sortedPaths = Array.from(new Set(paths)).sort((a, b) => a.localeCompare(b));
  const result = {};
  for (const path of sortedPaths) {
    const resolved = resolvePath(value, path);
    result[path] = resolved.found ? resolved.value : null;
  }

  return result;
}

export { ACTIONS };

export function executeTransformation({ action, input, filterText = '' }) {
  const startedAt = performance.now();
  const parsed = parseJson(input);

  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
      metrics: {
        durationMs: Number((performance.now() - startedAt).toFixed(2)),
        inputChars: input.length,
        outputChars: 0
      }
    };
  }

  try {
    const deterministicValue = sortValueDeterministic(parsed.value);
    let transformed;

    if (action === ACTIONS.MINIFY) {
      transformed = deterministicValue;
    } else if (action === ACTIONS.FLATTEN) {
      transformed = flattenJson(deterministicValue);
    } else if (action === ACTIONS.EXTRACT_KEYS) {
      transformed = { keys: extractKeys(deterministicValue) };
    } else if (action === ACTIONS.FILTER_PATHS) {
      transformed = filterPaths(deterministicValue, filterText);
    } else {
      transformed = deterministicValue;
    }

    const spacing = action === ACTIONS.MINIFY ? 0 : 2;
    const output = JSON.stringify(transformed, null, spacing);
    const durationMs = Number((performance.now() - startedAt).toFixed(2));

    return {
      ok: true,
      output,
      diagnostics: {
        action,
        timestamp: new Date().toISOString(),
        notes: `Transformation completed using ${action}.`
      },
      metrics: {
        durationMs,
        inputChars: input.length,
        outputChars: output.length,
        throughputCharsPerMs: durationMs > 0 ? Number((input.length / durationMs).toFixed(2)) : input.length
      }
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        title: 'Transformation failed',
        message: error?.message || 'Unexpected transformation error.'
      },
      metrics: {
        durationMs: Number((performance.now() - startedAt).toFixed(2)),
        inputChars: input.length,
        outputChars: 0
      }
    };
  }
}
