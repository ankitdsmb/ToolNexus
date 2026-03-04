import { loadToolPack } from './tool-pack-loader.js';
import { resolveToolFromPackRegistry } from './tool-pack-registry.js';
import { recordToolPackUsage } from '../prefetch/tool-pack-usage-tracker.js';
import { prefetchRelatedToolPacks } from '../prefetch/tool-pack-prefetcher.js';

function normalizePackName(packName) {
  const normalized = String(packName ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

export async function resolveToolModuleFromPack({ slug, packName } = {}) {
  const normalizedSlug = String(slug ?? '').trim();
  const normalizedPackName = normalizePackName(packName);

  if (!normalizedSlug || !normalizedPackName) {
    return null;
  }

  await loadToolPack(normalizedPackName);
  recordToolPackUsage({ toolSlug: normalizedSlug, packName: normalizedPackName });
  prefetchRelatedToolPacks(normalizedPackName);
  const entry = resolveToolFromPackRegistry(normalizedSlug);

  if (!entry) {
    return null;
  }

  return {
    ...entry,
    modulePath: entry.modulePath ?? entry.module ?? null,
    module: entry.modulePath ?? entry.module ?? null
  };
}
