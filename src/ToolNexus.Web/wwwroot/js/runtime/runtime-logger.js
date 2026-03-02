const DEFAULT_LOG_ENDPOINT = null;
const LOG_LEVELS = Object.freeze({
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
});
const LOG_LEVEL_ORDER = [LOG_LEVELS.DEBUG, LOG_LEVELS.INFO, LOG_LEVELS.WARN, LOG_LEVELS.ERROR];

function truncate(value, max = 1200) {
  const stringValue = String(value ?? '');
  return stringValue.length > max ? stringValue.slice(0, max) : stringValue;
}

function normalizeLevel(level) {
  const value = String(level ?? 'info').toLowerCase();
  return LOG_LEVEL_ORDER.includes(value) ? value : LOG_LEVELS.INFO;
}

function shouldWrite(level, minLevel) {
  return LOG_LEVEL_ORDER.indexOf(level) >= LOG_LEVEL_ORDER.indexOf(normalizeLevel(minLevel));
}

function buildSessionId() {
  const toolSlug = window.ToolNexusConfig?.tool?.slug || 'tool';
  const correlationId = getCorrelationId() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${toolSlug}:${correlationId}`;
}

function getCorrelationId() {
  return window.ToolNexus?.correlationId
    || document.querySelector('meta[name="x-correlation-id"]')?.content
    || null;
}

function normalizeEndpointPath(endpoint) {
  if (typeof endpoint !== 'string' || endpoint.trim().length === 0) {
    return null;
  }

  const raw = endpoint.trim();
  if (!raw.startsWith('/')) {
    return null;
  }

  try {
    return new URL(raw, window.location.origin).pathname;
  } catch {
    return null;
  }
}

function isEndpointRoutable(endpoint) {
  const endpointPath = normalizeEndpointPath(endpoint);
  if (!endpointPath) {
    return false;
  }

  const configuredRoutes = window.ToolNexusConfig?.runtimeRoutes?.clientLogEndpoints;
  const routeSet = Array.isArray(configuredRoutes) ? configuredRoutes : [];
  const knownPaths = routeSet
    .map(normalizeEndpointPath)
    .filter(Boolean);

  if (knownPaths.length === 0) {
    return false;
  }

  return knownPaths.some(path => path.toLowerCase() === endpointPath.toLowerCase());
}

export function createRuntimeLogger({
  source = 'runtime',
  endpoint = window.ToolNexusConfig?.runtimeLogEndpoint || DEFAULT_LOG_ENDPOINT,
  minLevel = window.ToolNexusLogging?.minimumLevel || 'info',
  runtimeDebugEnabled = Boolean(window.ToolNexusLogging?.runtimeDebugEnabled),
  enableClientIncidents = window.ToolNexusLogging?.enableRuntimeLogCapture !== false,
  sink = console,
  transport = globalThis.fetch
} = {}) {
  let activeSessionId = buildSessionId();
  const messageTally = new Map();

  function formatSessionPrefix() {
    return `[${source}][session:${activeSessionId}]`;
  }

  function trackMessage(level, message) {
    const key = `${level}|${String(message)}`;
    const next = (messageTally.get(key) ?? 0) + 1;
    messageTally.set(key, next);
    return next;
  }

  function flushSummary(summaryLevel = LOG_LEVELS.INFO, reason = 'runtime summary') {
    if (messageTally.size === 0) {
      return;
    }

    const entries = Array.from(messageTally.entries()).map(([key, count]) => {
      const separatorIndex = key.indexOf('|');
      const level = separatorIndex >= 0 ? key.slice(0, separatorIndex) : LOG_LEVELS.INFO;
      const message = separatorIndex >= 0 ? key.slice(separatorIndex + 1) : key;
      return { level, message, count };
    });
    messageTally.clear();

    write(summaryLevel, `${reason}: ${entries.length} grouped event(s).`, { events: entries, summarized: true });
  }

  async function push(level, message, metadata) {
    const normalizedLevel = normalizeLevel(level);
    if (!enableClientIncidents || !shouldWrite(normalizedLevel, minLevel)) {
      return;
    }

    if (normalizedLevel === 'debug' && !runtimeDebugEnabled) {
      return;
    }

    if (!isEndpointRoutable(endpoint) || typeof transport !== 'function') {
      return;
    }

    try {
      await transport(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: [{
            source,
            level: normalizedLevel,
            message: truncate(message, 1200),
            stack: truncate(metadata?.stack, 2000),
            toolSlug: window.ToolNexusConfig?.tool?.slug ?? null,
            correlationId: getCorrelationId(),
            sessionId: activeSessionId,
            timestamp: new Date().toISOString(),
            metadata: metadata ?? null
          }]
        })
      });
    } catch {
      // client logging is best effort and must never break runtime
    }
  }

  function write(level, message, metadata) {
    const normalizedLevel = normalizeLevel(level);
    if (!shouldWrite(normalizedLevel, minLevel)) {
      return;
    }

    const targetLevel = normalizedLevel === LOG_LEVELS.DEBUG && !runtimeDebugEnabled
      ? LOG_LEVELS.INFO
      : normalizedLevel === LOG_LEVELS.ERROR ? LOG_LEVELS.WARN : normalizedLevel;
    if (typeof sink?.[targetLevel] === 'function') {
      const shouldTrackMessage = metadata?.summarized !== true;
      const count = shouldTrackMessage ? trackMessage(normalizedLevel, message) : 1;
      if (count === 1 || normalizedLevel === LOG_LEVELS.ERROR || metadata?.forceWrite === true) {
        sink[targetLevel](`${formatSessionPrefix()} ${message}`, metadata);
      }
    }

    push(normalizedLevel, message, metadata);
  }

  return {
    LOG_LEVELS,
    beginSession: (sessionId) => {
      flushSummary(LOG_LEVELS.INFO, 'session rollover');
      activeSessionId = String(sessionId || buildSessionId());
    },
    endSession: (reason = 'session complete') => flushSummary(LOG_LEVELS.INFO, reason),
    summary: (summaryLevel = LOG_LEVELS.INFO, reason = 'runtime summary') => flushSummary(summaryLevel, reason),
    debug: (message, metadata) => write(LOG_LEVELS.DEBUG, message, metadata),
    info: (message, metadata) => write(LOG_LEVELS.INFO, message, metadata),
    warn: (message, metadata) => write(LOG_LEVELS.WARN, message, metadata),
    error: (message, metadata) => write(LOG_LEVELS.ERROR, message, metadata)
  };
}

export const runtimeLogger = createRuntimeLogger({ source: 'tool-runtime' });
