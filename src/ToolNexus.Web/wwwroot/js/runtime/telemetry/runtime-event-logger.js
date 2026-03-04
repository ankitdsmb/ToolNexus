import { RUNTIME_EVENT_TYPES } from './runtime-event-types.js';

const LOG_PREFIX = '[ToolNexus Runtime]';
const DEFAULT_THROTTLE_MS = 500;
const lastSignatureByEvent = new Map();

function normalizePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  return payload;
}

function shouldThrottle(eventId, payload, now, throttleMs) {
  const signature = JSON.stringify(payload);
  const previous = lastSignatureByEvent.get(eventId);
  if (!previous) {
    lastSignatureByEvent.set(eventId, { signature, timestamp: now });
    return false;
  }

  const duplicate = previous.signature === signature;
  const tooSoon = (now - previous.timestamp) < throttleMs;
  if (duplicate && tooSoon) {
    return true;
  }

  lastSignatureByEvent.set(eventId, { signature, timestamp: now });
  return false;
}

export function emitRuntimeEvent(eventId, payload = {}, options = {}) {
  if (!eventId || !Object.prototype.hasOwnProperty.call(RUNTIME_EVENT_TYPES, eventId)) {
    return;
  }

  const structuredPayload = normalizePayload(payload);
  const now = Date.now();
  const throttleMs = Number.isFinite(options.throttleMs) ? options.throttleMs : DEFAULT_THROTTLE_MS;
  if (shouldThrottle(eventId, structuredPayload, now, throttleMs)) {
    return;
  }

  console.info(LOG_PREFIX, eventId, structuredPayload);
}

export function __resetRuntimeEventLogThrottleForTests() {
  lastSignatureByEvent.clear();
}
