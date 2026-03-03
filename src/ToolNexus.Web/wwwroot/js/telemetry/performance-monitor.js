import { runtimeObserver } from '../runtime/runtime-observer.js';

const METRIC_ENDPOINT = '/metrics/client';
const TOOL_SWITCH_KEY = 'toolnexus:telemetry:tool-switch-start';

const now = () => globalThis.performance?.now?.() ?? Date.now();
const absNow = () => globalThis.performance?.timeOrigin ? globalThis.performance.timeOrigin + now() : Date.now();

function isEnabled() {
  return globalThis.window?.ToolNexusTelemetryEnabled === true;
}

function buildBasePayload() {
  return {
    pagePath: globalThis.location?.pathname ?? null,
    correlationId: globalThis.window?.ToolNexus?.correlationId ?? null,
    toolSlug: globalThis.window?.ToolNexusConfig?.tool?.slug ?? null,
    capturedAt: new Date().toISOString()
  };
}

function sendMetric(metricName, value, metadata = {}) {
  if (!isEnabled()) {
    return;
  }

  const payload = {
    ...buildBasePayload(),
    metricName,
    value,
    metadata
  };

  const body = JSON.stringify(payload);

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(METRIC_ENDPOINT, blob);
      return;
    }
  } catch {
    // telemetry failures must not impact runtime behavior
  }

  try {
    fetch(METRIC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      credentials: 'same-origin'
    }).catch(() => {});
  } catch {
    // telemetry failures must not impact runtime behavior
  }
}

function setupPaintObservers() {
  if (typeof PerformanceObserver !== 'function') {
    return;
  }

  try {
    const paintObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          sendMetric('fcp_ms', entry.startTime, { entryType: entry.entryType });
        }
      }
    });

    paintObserver.observe({ type: 'paint', buffered: true });
  } catch {
    // unsupported observer entry type
  }

  try {
    let finalLcp = 0;

    const lcpObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        finalLcp = entry.startTime;
      }
    });

    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    const flush = () => {
      if (finalLcp > 0) {
        sendMetric('lcp_ms', finalLcp);
      }
    };

    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    }, { once: true });

    addEventListener('pagehide', flush, { once: true });
  } catch {
    // unsupported observer entry type
  }

  try {
    let clsValue = 0;

    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      sendMetric('cls', clsValue);
    });

    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // unsupported observer entry type
  }
}

function setupLongTaskObserver() {
  if (typeof PerformanceObserver !== 'function') {
    return;
  }

  try {
    const longTaskObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        sendMetric('long_task_ms', entry.duration, {
          name: entry.name,
          startTime: entry.startTime,
          attribution: entry.attribution?.map((item) => item.name ?? item.containerType ?? 'unknown') ?? []
        });
      }
    });

    longTaskObserver.observe({ type: 'longtask', buffered: true });
  } catch {
    // unsupported observer entry type
  }
}

function setupToolInitDurationObserver() {
  let initStartedAt = null;
  let initCompleteSent = false;

  runtimeObserver.subscribe((entry) => {
    if (entry?.event !== 'lifecycle_stage_trace') {
      return;
    }

    const stage = entry.metadata?.stage;

    if (stage === 'lifecycle_create_init_start' || stage === 'mount_start') {
      initStartedAt = entry.timestamp;
      initCompleteSent = false;
      return;
    }

    if (initCompleteSent || stage !== 'lifecycle_create_init_complete' || initStartedAt == null) {
      return;
    }

    const durationMs = Math.max(0, entry.timestamp - initStartedAt);
    initCompleteSent = true;
    sendMetric('tool_init_duration_ms', durationMs, {
      toolSlug: entry.toolSlug ?? null
    });
  });
}

function setupToolSwitchLatencyObserver() {
  try {
    const switchStartedAt = Number.parseFloat(sessionStorage.getItem(TOOL_SWITCH_KEY) ?? '');
    if (Number.isFinite(switchStartedAt)) {
      const latency = Math.max(0, absNow() - switchStartedAt);
      sendMetric('tool_switch_latency_ms', latency);
      sessionStorage.removeItem(TOOL_SWITCH_KEY);
    }
  } catch {
    // session storage may be unavailable
  }

  addEventListener('click', (event) => {
    const anchor = event.target?.closest?.('a[href]');
    if (!anchor) {
      return;
    }

    try {
      const destination = new URL(anchor.href, globalThis.location?.origin);
      const current = globalThis.location?.pathname ?? '';
      const isToolRoute = /^\/tools\//i.test(destination.pathname);
      const isDifferentTool = isToolRoute && destination.pathname !== current;

      if (!isDifferentTool) {
        return;
      }

      sessionStorage.setItem(TOOL_SWITCH_KEY, String(absNow()));
    } catch {
      // URL/session parsing errors are non-fatal
    }
  }, { capture: true });
}

function initPerformanceMonitor() {
  if (!isEnabled()) {
    return;
  }

  setupPaintObservers();
  setupLongTaskObserver();
  setupToolInitDurationObserver();
  setupToolSwitchLatencyObserver();
}

initPerformanceMonitor();
