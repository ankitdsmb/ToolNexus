const DEFAULT_SAMPLE_SIZE = 25;

function getMemoryUsage() {
  try {
    const usage = globalThis.performance?.memory?.usedJSHeapSize;
    return Number.isFinite(usage) ? usage : null;
  } catch {
    return null;
  }
}

function createEmptyRecord(slug) {
  return {
    slug,
    avgExecutionTime: 0,
    executionTime: 0,
    executionCount: 0,
    errors: 0,
    errorCount: 0,
    crashes: 0,
    crashCount: 0,
    memoryUsage: null,
    lastExecution: null
  };
}

export function createToolPerformanceTracker({ now = () => Date.now(), sampleSize = DEFAULT_SAMPLE_SIZE } = {}) {
  const records = new Map();
  const executionSamples = new Map();

  function ensureRecord(slug) {
    const normalizedSlug = typeof slug === 'string' && slug.trim() ? slug.trim() : 'unknown-tool';
    if (!records.has(normalizedSlug)) {
      records.set(normalizedSlug, createEmptyRecord(normalizedSlug));
    }

    return records.get(normalizedSlug);
  }

  function pushSample(slug, duration) {
    const samples = executionSamples.get(slug) ?? [];
    samples.push(duration);
    if (samples.length > sampleSize) {
      samples.shift();
    }

    executionSamples.set(slug, samples);
    const total = samples.reduce((sum, value) => sum + value, 0);
    return samples.length > 0 ? total / samples.length : 0;
  }

  function startExecution(slug) {
    const record = ensureRecord(slug);
    return {
      slug: record.slug,
      startedAt: now(),
      startedMemoryUsage: getMemoryUsage()
    };
  }

  function completeExecution(execution, { failed = false, crashed = false } = {}) {
    const record = ensureRecord(execution?.slug);
    const duration = Math.max(0, now() - (execution?.startedAt ?? now()));
    const endedMemoryUsage = getMemoryUsage();

    record.executionCount += 1;
    record.executionTime = duration;
    record.avgExecutionTime = pushSample(record.slug, duration);
    record.lastExecution = now();
    record.memoryUsage = endedMemoryUsage ?? execution?.startedMemoryUsage ?? record.memoryUsage;

    if (failed) {
      record.errors += 1;
      record.errorCount = record.errors;
    }

    if (crashed) {
      record.crashes += 1;
      record.crashCount = record.crashes;
    }

    return { ...record };
  }

  function markError(slug) {
    const record = ensureRecord(slug);
    record.errors += 1;
    record.errorCount = record.errors;
    return { ...record };
  }

  function markCrash(slug) {
    const record = ensureRecord(slug);
    record.crashes += 1;
    record.crashCount = record.crashes;
    return { ...record };
  }

  function getHealthRecord(slug) {
    return { ...ensureRecord(slug) };
  }

  function getAllHealthRecords() {
    return Array.from(records.values(), record => ({ ...record }));
  }

  return {
    startExecution,
    completeExecution,
    markError,
    markCrash,
    getHealthRecord,
    getAllHealthRecords
  };
}
