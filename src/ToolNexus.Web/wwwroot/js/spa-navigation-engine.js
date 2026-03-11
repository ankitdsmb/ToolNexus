if (typeof window === 'undefined' || typeof document === 'undefined') {
  // no-op outside browser
} else {
  let initialized = false;
  let inFlightNavigation = null;
  let runtimeBootstrapGeneration = 0;
  const heapTrendSamples = [];

  const SIMPLE_TOOLS = ['base64-encode', 'case-converter', 'json-minifier'];

  const logError = (message, error) => {
    console.error(`[ToolNexusSpa] ${message}`, error);
  };

  const warnOnDuplicateToolShells = () => {
    const toolShellCount = document.querySelectorAll('[data-tool-shell]').length;
    if (toolShellCount > 1) {
      console.warn(`[ToolNexusSpa] Multiple [data-tool-shell] elements detected (${toolShellCount}).`);
    }
  };

  const runRuntimeCleanup = () => {
    if (typeof window.ToolNexusRuntimeCleanup !== 'function') return;

    try {
      window.ToolNexusRuntimeCleanup();
    } catch (error) {
      logError('Runtime cleanup failed before DOM swap.', error);
    }
  };

  const bootstrapRuntimeOnceForSwap = (swapGeneration) => {
    if (typeof window.bootstrapToolRuntime !== 'function') return;
    if (runtimeBootstrapGeneration === swapGeneration) return;

    runtimeBootstrapGeneration = swapGeneration;
    window.bootstrapToolRuntime();
  };

  const isDevelopmentRuntime = () => {
    try {
      const config = window.ToolNexusConfig || {};
      const environment = String(config.environment || config.env || '').trim().toLowerCase();
      return ['development', 'dev', 'test', 'testing'].includes(environment);
    } catch {
      return false;
    }
  };

  const ensureNavigationMetrics = () => {
    if (!window.__spaNavigationMetrics || typeof window.__spaNavigationMetrics !== 'object') {
      window.__spaNavigationMetrics = { navigationCount: 0, lastNavigationTs: 0 };
    }

    if (typeof window.__spaNavigationMetrics.navigationCount !== 'number') {
      window.__spaNavigationMetrics.navigationCount = 0;
    }

    if (typeof window.__spaNavigationMetrics.lastNavigationTs !== 'number') {
      window.__spaNavigationMetrics.lastNavigationTs = 0;
    }

    return window.__spaNavigationMetrics;
  };

  const recordNavigationMetrics = () => {
    try {
      const metrics = ensureNavigationMetrics();
      metrics.navigationCount += 1;
      metrics.lastNavigationTs = Date.now();
    } catch {
      // telemetry-only
    }
  };

  const verifyToolShellCount = () => {
    try {
      const toolShellCount = document.querySelectorAll('[data-tool-shell]').length;
      if (toolShellCount > 1) {
        console.warn('[ToolNexus SPA] Multiple [data-tool-shell] elements detected after navigation swap.', {
          count: toolShellCount,
          href: window.location.href
        });
      }
    } catch {
      // guard-only
    }
  };

  const recordHeapTrend = () => {
    if (!isDevelopmentRuntime()) return;

    try {
      if (!window.performance?.memory || typeof window.performance.memory.usedJSHeapSize !== 'number') return;

      heapTrendSamples.push(window.performance.memory.usedJSHeapSize);
      if (heapTrendSamples.length > 6) heapTrendSamples.shift();
      if (heapTrendSamples.length < 4) return;

      const recent = heapTrendSamples.slice(-4);
      let isIncreasing = true;
      for (let i = 1; i < recent.length; i += 1) {
        if (recent[i] <= recent[i - 1]) {
          isIncreasing = false;
          break;
        }
      }

      if (isIncreasing) {
        console.warn('[ToolNexus SPA] JS heap usage is consistently increasing across SPA navigations.', {
          samples: recent.slice()
        });
      }
    } catch {
      // telemetry-only
    }
  };

  const getAppRoot = (doc) => doc.getElementById('app-page-root');

  const isHashOnlyNavigation = (url) => (
    url.pathname === window.location.pathname &&
    url.search === window.location.search &&
    url.hash !== ''
  );

  const isInterceptableAnchor = (anchor) => {
    if (!anchor || anchor.tagName !== 'A') return false;
    if (anchor.target && anchor.target.toLowerCase() === '_blank') return false;
    if (anchor.hasAttribute('download') || !anchor.href) return false;

    let destination;
    try {
      destination = new URL(anchor.href, window.location.href);
    } catch {
      return false;
    }

    if (destination.origin !== window.location.origin) return false;
    return !isHashOnlyNavigation(destination);
  };

  const shouldUseSpaNavigation = (href) => {
    let destination;
    try {
      destination = new URL(href, window.location.href);
    } catch {
      return false;
    }

    if (!destination.pathname.startsWith('/tools/')) return true;

    const segments = destination.pathname.split('/').filter((segment) => segment.length > 0);
    const slug = segments.length > 1 ? segments[1] : '';
    return SIMPLE_TOOLS.includes(slug);
  };

  const loadAndSwap = async (url, pushHistory) => {
    if (inFlightNavigation?.url === url) {
      return inFlightNavigation.promise;
    }

    const navigationTask = (async () => {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'ToolNexusSpaNavigation' }
      });

      if (!response.ok) {
        throw new Error(`Navigation fetch failed with status ${response.status}.`);
      }

      const html = await response.text();
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const incomingRoot = getAppRoot(parsed);
      const currentRoot = getAppRoot(document);

      if (!incomingRoot || !currentRoot) {
        throw new Error('Missing #app-page-root during SPA navigation swap.');
      }

      runRuntimeCleanup();
      currentRoot.replaceChildren(...Array.from(incomingRoot.childNodes));
      document.title = parsed.title || document.title;
      warnOnDuplicateToolShells();
      bootstrapRuntimeOnceForSwap(Date.now());

      recordNavigationMetrics();
      verifyToolShellCount();
      recordHeapTrend();

      if (pushHistory) {
        window.history.pushState({ spa: true }, '', url);
      }
    })();

    inFlightNavigation = { url, promise: navigationTask };

    try {
      await navigationTask;
    } finally {
      if (inFlightNavigation?.promise === navigationTask) {
        inFlightNavigation = null;
      }
    }
  };

  const handleDocumentClick = (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const anchor = event.target?.closest ? event.target.closest('a') : null;
    if (!isInterceptableAnchor(anchor) || !shouldUseSpaNavigation(anchor.href)) return;

    event.preventDefault();
    loadAndSwap(anchor.href, true).catch(() => {
      window.location.assign(anchor.href);
    });
  };

  const handlePopState = () => {
    if (!shouldUseSpaNavigation(window.location.href)) {
      window.location.reload();
      return;
    }

    loadAndSwap(window.location.href, false).catch(() => {
      window.location.reload();
    });
  };

  const init = () => {
    if (initialized) return;

    ensureNavigationMetrics();
    initialized = true;
    document.addEventListener('click', handleDocumentClick);
    window.addEventListener('popstate', handlePopState);
  };

  window.ToolNexusSpa = { init };
  init();
}
