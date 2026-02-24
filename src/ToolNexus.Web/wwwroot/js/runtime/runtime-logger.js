const DEFAULT_LOG_ENDPOINT = null;

function truncate(value, max = 1200) {
  const stringValue = String(value ?? '');
  return stringValue.length > max ? stringValue.slice(0, max) : stringValue;
}

function normalizeLevel(level) {
  const value = String(level ?? 'info').toLowerCase();
  return ['debug', 'info', 'warn', 'error'].includes(value) ? value : 'info';
}

function shouldWrite(level, minLevel) {
  const order = ['debug', 'info', 'warn', 'error'];
  return order.indexOf(level) >= order.indexOf(normalizeLevel(minLevel));
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
          source,
          level: normalizedLevel,
          message: truncate(message, 1200),
          stack: truncate(metadata?.stack, 2000),
          toolSlug: window.ToolNexusConfig?.tool?.slug ?? null,
          correlationId: getCorrelationId(),
          timestamp: new Date().toISOString(),
          metadata: metadata ?? null
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

    const targetLevel = normalizedLevel === 'debug' && !runtimeDebugEnabled
      ? 'info'
      : normalizedLevel === 'error' ? 'warn' : normalizedLevel;
    if (typeof sink?.[targetLevel] === 'function') {
      sink[targetLevel](`[${source}] ${message}`, metadata);
    }

    push(normalizedLevel, message, metadata);
  }

  return {
    debug: (message, metadata) => write('debug', message, metadata),
    info: (message, metadata) => write('info', message, metadata),
    warn: (message, metadata) => write('warn', message, metadata),
    error: (message, metadata) => write('error', message, metadata)
  };
}

export const runtimeLogger = createRuntimeLogger({ source: 'tool-runtime' });
