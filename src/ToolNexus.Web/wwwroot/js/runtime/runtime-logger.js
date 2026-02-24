const DEFAULT_LOG_ENDPOINT = '/api/admin/runtime/incidents/logs';

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

export function createRuntimeLogger({
  source = 'runtime',
  endpoint = window.ToolNexusConfig?.runtimeLogEndpoint || DEFAULT_LOG_ENDPOINT,
  minLevel = window.ToolNexusLogging?.minLevel || 'info',
  runtimeDebugEnabled = Boolean(window.ToolNexusLogging?.runtimeDebugEnabled),
  enableClientIncidents = window.ToolNexusLogging?.enableClientIncidents !== false,
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

    try {
      await transport(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: [{
            source,
            level: normalizedLevel,
            message: String(message ?? ''),
            toolSlug: window.ToolNexusConfig?.tool?.slug ?? null,
            correlationId: getCorrelationId(),
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

    const targetLevel = normalizedLevel === 'debug' && !runtimeDebugEnabled ? 'info' : normalizedLevel;
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
