const packLoadCount = new Map();
const recentToolUsage = [];
const MAX_RECENT_TOOL_USAGE = 20;

function normalizePackName(packName) {
  const normalized = String(packName ?? '').trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return normalized.endsWith('-pack')
    ? normalized.slice(0, -5)
    : normalized;
}

export function recordToolPackUsage({ toolSlug, packName } = {}) {
  const normalizedToolSlug = String(toolSlug ?? '').trim().toLowerCase();
  const normalizedPackName = normalizePackName(packName);

  if (!normalizedToolSlug || !normalizedPackName) {
    return;
  }

  packLoadCount.set(normalizedPackName, (packLoadCount.get(normalizedPackName) ?? 0) + 1);
  recentToolUsage.unshift({
    toolSlug: normalizedToolSlug,
    packName: normalizedPackName,
    usedAt: Date.now()
  });

  if (recentToolUsage.length > MAX_RECENT_TOOL_USAGE) {
    recentToolUsage.length = MAX_RECENT_TOOL_USAGE;
  }
}

export function getToolPackUsageMetrics() {
  return {
    packLoadCount: Object.fromEntries(packLoadCount),
    recentToolUsage: [...recentToolUsage]
  };
}

export function __resetToolPackUsageTrackerForTests() {
  packLoadCount.clear();
  recentToolUsage.length = 0;
}
