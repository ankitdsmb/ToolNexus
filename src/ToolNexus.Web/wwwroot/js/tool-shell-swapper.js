(() => {
  const TOOL_SHELL_SELECTOR = '[data-tool-shell]';
  const TOOL_CONTENT_HOST_SELECTOR = '[data-tool-content-host]';

  if (!document.querySelector(TOOL_SHELL_SELECTOR)) {
    return;
  }

  const originalScrollRestoration = history.scrollRestoration;

  function preserveCurrentScrollInState() {
    const currentState = history.state && typeof history.state === 'object' ? history.state : {};
    history.replaceState(
      {
        ...currentState,
        scrollX: window.scrollX,
        scrollY: window.scrollY
      },
      '',
      window.location.href
    );
  }

  function setManualScrollRestoration() {
    try {
      history.scrollRestoration = 'manual';
    } catch {
      // no-op: not supported in this browser/runtime.
    }
  }

  function resolveBootstrapToolRuntime() {
    if (typeof window.bootstrapToolRuntime === 'function') {
      return window.bootstrapToolRuntime.bind(window);
    }

    if (typeof window.ToolNexusRuntime?.bootstrapToolRuntime === 'function') {
      return window.ToolNexusRuntime.bootstrapToolRuntime.bind(window.ToolNexusRuntime);
    }

    return null;
  }

  function normalizeSlug(slug) {
    return String(slug ?? '').trim();
  }

  async function swapToolContent(slug, { pushState } = { pushState: true }) {
    const toolSlug = normalizeSlug(slug);
    if (!toolSlug) {
      throw new Error('Tool slug is required.');
    }

    preserveCurrentScrollInState();

    const response = await fetch(`/tools/${encodeURIComponent(toolSlug)}?partial=1`, {
      headers: {
        Accept: 'text/html'
      }
    });

    if (!response.ok) {
      throw new Error(`Partial tool load failed (${response.status}).`);
    }

    const incomingHtml = await response.text();
    const parser = new DOMParser();
    const incomingDocument = parser.parseFromString(incomingHtml, 'text/html');

    const nextContentHost = incomingDocument.querySelector(TOOL_CONTENT_HOST_SELECTOR);
    const currentContentHost = document.querySelector(TOOL_CONTENT_HOST_SELECTOR);

    if (!currentContentHost || !nextContentHost) {
      throw new Error('Tool content host missing in current or fetched markup.');
    }

    currentContentHost.replaceWith(nextContentHost);

    const nextTitle = incomingDocument.querySelector('title')?.textContent?.trim();
    if (nextTitle) {
      document.title = nextTitle;
    }

    const bootstrapToolRuntime = resolveBootstrapToolRuntime();
    await bootstrapToolRuntime?.();

    if (pushState) {
      setManualScrollRestoration();
      history.pushState(
        {
          toolSlug,
          scrollX: 0,
          scrollY: 0
        },
        '',
        `/tools/${encodeURIComponent(toolSlug)}`
      );
      window.scrollTo(0, 0);
    }
  }

  async function loadTool(slug) {
    const toolSlug = normalizeSlug(slug);

    try {
      await swapToolContent(toolSlug, { pushState: true });
    } catch {
      window.location.href = `/tools/${encodeURIComponent(toolSlug)}`;
    }
  }

  async function handlePopState() {
    const match = window.location.pathname.match(/^\/tools\/([^/]+)$/i);
    if (!match) {
      return;
    }

    const slugFromLocation = decodeURIComponent(match[1]);

    try {
      setManualScrollRestoration();
      await swapToolContent(slugFromLocation, { pushState: false });

      const state = history.state && typeof history.state === 'object' ? history.state : null;
      const targetX = Number.isFinite(state?.scrollX) ? state.scrollX : 0;
      const targetY = Number.isFinite(state?.scrollY) ? state.scrollY : 0;
      window.requestAnimationFrame(() => {
        window.scrollTo(targetX, targetY);
      });
    } catch {
      window.location.href = window.location.href;
    }
  }

  window.addEventListener('popstate', handlePopState);
  window.addEventListener('beforeunload', () => {
    try {
      history.scrollRestoration = originalScrollRestoration;
    } catch {
      // no-op.
    }
  });

  window.loadTool = loadTool;
})();
