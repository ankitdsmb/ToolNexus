import { isToolPackRegistered, registerToolPack } from './tool-pack-registry.js';

const packLoadPromises = new Map();

function normalizePackName(packName) {
  const normalized = String(packName ?? '').trim().toLowerCase();
  if (!normalized) {
    return '';
  }

  return normalized.endsWith('-pack')
    ? normalized.slice(0, -5)
    : normalized;
}

export async function loadToolPack(packName) {
  const normalizedPackName = normalizePackName(packName);
  if (!normalizedPackName) {
    throw new Error('[ToolPackLoader] packName is required.');
  }

  if (isToolPackRegistered(normalizedPackName)) {
    return true;
  }

  if (packLoadPromises.has(normalizedPackName)) {
    return packLoadPromises.get(normalizedPackName);
  }

  const loadPromise = import(`/js/tool-packs/${normalizedPackName}-pack.js`)
    .then((packModule) => {
      registerToolPack(normalizedPackName, packModule);
      return true;
    })
    .finally(() => {
      packLoadPromises.delete(normalizedPackName);
    });

  packLoadPromises.set(normalizedPackName, loadPromise);
  return loadPromise;
}

export function __resetToolPackLoaderForTests() {
  packLoadPromises.clear();
}
