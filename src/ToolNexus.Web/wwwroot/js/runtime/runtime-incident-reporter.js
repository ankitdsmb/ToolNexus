const DEFAULT_ENDPOINT = '/api/admin/runtime/incidents';
const DEFAULT_LOG_ENDPOINT = null;
const DEFAULT_DEBOUNCE_MS = 1500;
const DEFAULT_MAX_BATCH_SIZE = 20;

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

function isRoutableClientLogEndpoint(endpoint) {
  const endpointPath = normalizeEndpointPath(endpoint);
  if (!endpointPath) {
    return false;
  }

  const configuredRoutes = window.ToolNexusConfig?.runtimeRoutes?.clientLogEndpoints;
  const knownPaths = Array.isArray(configuredRoutes)
    ? configuredRoutes.map(normalizeEndpointPath).filter(Boolean)
    : [];

  return knownPaths.some(path => path.toLowerCase() === endpointPath.toLowerCase());
}

function sanitizeString(value, maxLength = 2000) {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim();
  if (!normalized) {
    return '';
  }

  return normalized.slice(0, maxLength);
}

function normalizePayloadType(payloadType) {
  const normalized = sanitizeString(payloadType, 80).toLowerCase();
  return normalized || 'unknown';
}

function normalizeIncident(incident) {
  const toolSlug = sanitizeString(incident?.toolSlug, 120) || 'unknown-tool';
  const phase = ['bootstrap', 'mount', 'execute'].includes(incident?.phase) ? incident.phase : 'execute';
  const errorType = ['contract_violation', 'contract_drift', 'runtime_error'].includes(incident?.errorType) ? incident.errorType : 'runtime_error';
  const message = sanitizeString(incident?.message, 1200) || 'runtime incident';
  const stack = sanitizeString(incident?.stack, 4000);
  const payloadType = normalizePayloadType(incident?.payloadType);
  const timestamp = sanitizeString(incident?.timestamp, 60) || new Date().toISOString();
  const severity = ['contract_violation', 'contract_drift'].includes(errorType) ? 'warning' : 'critical';

  return { toolSlug, phase, errorType, message, severity, stack, payloadType, timestamp };
}

function normalizeIncidentPayload(incident) {
  const normalizedIncident = normalizeIncident(incident);
  const normalizedCount = Number.isFinite(incident?.count) && incident.count > 0
    ? Math.floor(incident.count)
    : 1;
  const normalizedFingerprint = sanitizeString(incident?.fingerprint, 400) || buildFingerprint(normalizedIncident);

  return {
    toolSlug: normalizedIncident.toolSlug,
    phase: normalizedIncident.phase,
    errorType: normalizedIncident.errorType,
    message: normalizedIncident.message,
    severity: normalizedIncident.severity,
    stack: normalizedIncident.stack || null,
    payloadType: normalizedIncident.payloadType,
    timestamp: normalizedIncident.timestamp,
    count: normalizedCount,
    fingerprint: normalizedFingerprint,
    correlationId: null,
    metadata: null
  };
}

function normalizeRuntimeLogPayload(incident) {
  const normalizedIncident = normalizeIncident(incident);
  const normalizedCount = Number.isFinite(incident?.count) && incident.count > 0
    ? Math.floor(incident.count)
    : 1;

  return {
    source: 'runtime.incident-reporter',
    level: 'error',
    message: normalizedIncident.message,
    stack: normalizedIncident.stack || null,
    toolSlug: normalizedIncident.toolSlug,
    correlationId: null,
    timestamp: normalizedIncident.timestamp,
    metadata: {
      phase: normalizedIncident.phase,
      errorType: normalizedIncident.errorType,
      payloadType: normalizedIncident.payloadType,
      count: normalizedCount
    }
  };
}

function buildFingerprint(incident) {
  return [incident.toolSlug, incident.phase, incident.errorType, incident.message, incident.payloadType].join('::');
}

async function postBatch(endpoint, batch) {
  if (!Array.isArray(batch) || batch.length === 0) {
    return;
  }

  if (typeof globalThis.fetch !== 'function') {
    return;
  }

  await fetch(endpoint, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incidents: batch.map(normalizeIncidentPayload) })
  });
}

async function postRuntimeLog(endpoint, incident) {
  if (!endpoint || typeof globalThis.fetch !== 'function') {
    return;
  }

  await fetch(endpoint, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logs: [normalizeRuntimeLogPayload(incident)] })
  });
}

export function createRuntimeIncidentReporter({
  endpoint = DEFAULT_ENDPOINT,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  maxBatchSize = DEFAULT_MAX_BATCH_SIZE,
  now = () => Date.now(),
  sendBatch = postBatch,
  runtimeLogEndpoint = window.ToolNexusConfig?.runtimeLogEndpoint || DEFAULT_LOG_ENDPOINT,
  sendRuntimeLog = postRuntimeLog,
  enabled = window.ToolNexusLogging?.enableRuntimeLogCapture !== false
} = {}) {
  const queue = [];
  const dedupeMap = new Map();
  let timer = null;
  let inFlight = false;

  function scheduleFlush() {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, debounceMs);
  }

  function report(rawIncident) {
    if (!enabled) {
      return;
    }

    try {
      const normalized = normalizeIncident(rawIncident);
      const fingerprint = buildFingerprint(normalized);
      const existing = dedupeMap.get(fingerprint);
      const timestampMs = now();

      if (existing) {
        existing.count += 1;
        existing.timestamp = normalized.timestamp;
        existing.lastSeenMs = timestampMs;
      } else {
        dedupeMap.set(fingerprint, {
          ...normalized,
          count: 1,
          lastSeenMs: timestampMs
        });

        if (isRoutableClientLogEndpoint(runtimeLogEndpoint)) {
          void sendRuntimeLog(runtimeLogEndpoint, normalized);
        }
      }

      scheduleFlush();
    } catch {
      // incident recording must never impact runtime execution
    }
  }

  async function flush() {
    if (!enabled || inFlight || dedupeMap.size === 0) {
      return;
    }

    inFlight = true;
    try {
      for (const [fingerprint, incident] of dedupeMap.entries()) {
        queue.push({
          ...incident,
          fingerprint
        });
      }
      dedupeMap.clear();

      while (queue.length > 0) {
        const batch = queue.splice(0, maxBatchSize);
        await sendBatch(endpoint, batch);
      }
    } catch {
      // keep best-effort guarantees without throwing into runtime
    } finally {
      inFlight = false;
    }
  }

  return {
    report,
    flush,
    getPendingCount: () => queue.length + dedupeMap.size
  };
}

export const runtimeIncidentReporter = createRuntimeIncidentReporter();

export { normalizeIncidentPayload };
