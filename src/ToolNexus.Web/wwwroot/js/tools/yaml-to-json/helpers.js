import { DEFAULT_STATS, POLLUTION_KEYS } from './constants.js';

export function getInputMetrics(value) {
  const normalized = value ?? '';
  return {
    lines: normalized ? normalized.split(/\r\n|\r|\n/).length : 0,
    bytes: new TextEncoder().encode(normalized).length
  };
}

export function computeNodeStats(root) {
  const stats = { ...DEFAULT_STATS };

  const walk = (node) => {
    if (Array.isArray(node)) {
      stats.arrays += 1;
      node.forEach(walk);
      return;
    }

    if (node && typeof node === 'object') {
      stats.objects += 1;
      Object.values(node).forEach(walk);
      return;
    }

    stats.primitives += 1;
  };

  walk(root);
  return stats;
}

export function toSafeJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map(toSafeJsonValue);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const target = {};
  for (const [key, child] of Object.entries(value)) {
    if (POLLUTION_KEYS.has(key)) {
      continue;
    }

    target[key] = toSafeJsonValue(child);
  }

  return target;
}

export function sortObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const sorted = {};
  for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b))) {
    sorted[key] = sortObjectKeys(value[key]);
  }

  return sorted;
}

export function yieldToBrowser() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
