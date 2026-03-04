import { getToolPackUsageMetrics } from './tool-pack-usage-tracker.js';

const prefetchedPacks = new Set();
const queuedPacks = new Set();

const DEFAULT_PACK_RELATIONS = Object.freeze({
  'json-tools': ['encoding-tools', 'developer-tools']
});

function normalizePackName(packName) {
  const normalized = String(packName ?? '').trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return normalized.endsWith('-pack')
    ? normalized.slice(0, -5)
    : normalized;
}

function scheduleIdle(task) {
  if (typeof task !== 'function') {
    return;
  }

  if (typeof globalThis.requestIdleCallback === 'function') {
    globalThis.requestIdleCallback(() => task(), { timeout: 300 });
    return;
  }

  setTimeout(task, 0);
}

function getPackRelations() {
  const configuredRelations = window.ToolNexusConfig?.toolPackPrefetchRelations;
  return configuredRelations && typeof configuredRelations === 'object'
    ? configuredRelations
    : DEFAULT_PACK_RELATIONS;
}

function createPackImportPath(packName) {
  return `/js/tool-packs/${packName}-pack.js`;
}

async function prefetchPack(packName) {
  if (!packName || prefetchedPacks.has(packName)) {
    return;
  }

  try {
    const pack = createPackImportPath(packName);
    await import(/* webpackPrefetch: true */ pack);
    prefetchedPacks.add(packName);
  } catch (error) {
    console.warn('[ToolPackPrefetcher] Failed to prefetch tool pack.', {
      packName,
      message: error?.message ?? String(error)
    });
  }
}

function queuePrefetch(packName) {
  const normalizedPackName = normalizePackName(packName);
  if (!normalizedPackName || prefetchedPacks.has(normalizedPackName) || queuedPacks.has(normalizedPackName)) {
    return;
  }

  queuedPacks.add(normalizedPackName);
  scheduleIdle(async () => {
    queuedPacks.delete(normalizedPackName);
    await prefetchPack(normalizedPackName);
  });
}

export function prefetchRelatedToolPacks(packName) {
  const normalizedPackName = normalizePackName(packName);
  if (!normalizedPackName) {
    return;
  }

  const packRelations = getPackRelations();
  const relatedPacks = packRelations[normalizedPackName] ?? [];
  for (const relatedPack of relatedPacks) {
    queuePrefetch(relatedPack);
  }

  const usageMetrics = getToolPackUsageMetrics();
  const mostLoadedPacks = Object.entries(usageMetrics.packLoadCount)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([loadedPackName]) => loadedPackName)
    .filter((loadedPackName) => loadedPackName !== normalizedPackName);

  for (const loadedPackName of mostLoadedPacks) {
    queuePrefetch(loadedPackName);
  }
}

export function __resetToolPackPrefetcherForTests() {
  prefetchedPacks.clear();
  queuedPacks.clear();
}
