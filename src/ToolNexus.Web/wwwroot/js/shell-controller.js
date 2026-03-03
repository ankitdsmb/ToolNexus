const TOOL_ROUTE_PATTERN = /^\/tools\/([^/?#]+)/i;

const controllerState = {
  initialized: false,
  activeRequestId: 0,
  activeSlug: null,
  inFlightSlug: null
};

function getSlugFromPath(pathname = window.location.pathname) {
  const match = TOOL_ROUTE_PATTERN.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

function isPlainLeftClick(event) {
  return event.button === 0
    && !event.metaKey
    && !event.ctrlKey
    && !event.shiftKey
    && !event.altKey;
}

function extractToolSlugFromLink(link) {
  if (!link) {
    return null;
  }

  let parsed;
  try {
    parsed = new URL(link.href, window.location.origin);
  } catch {
    return null;
  }

  if (parsed.origin !== window.location.origin) {
    return null;
  }

  return getSlugFromPath(parsed.pathname);
}

function copyAttributes(fromElement, toElement) {
  if (!fromElement || !toElement) {
    return;
  }

  for (const attr of [...toElement.attributes]) {
    toElement.removeAttribute(attr.name);
  }

  for (const attr of [...fromElement.attributes]) {
    toElement.setAttribute(attr.name, attr.value);
  }
}

async function swapToolShell(slug, htmlText) {
  const parser = new DOMParser();
  const incomingDocument = parser.parseFromString(htmlText, 'text/html');

  const incomingShell = incomingDocument.querySelector('.tool-shell-page');
  const incomingRoot = incomingDocument.querySelector('#tool-root[data-tool-root="true"]');

  if (!incomingShell || !incomingRoot) {
    throw new Error(`Tool shell markup missing for "${slug}".`);
  }

  const currentShell = document.querySelector('.tool-shell-page');
  const currentRoot = document.querySelector('#tool-root[data-tool-root="true"]');

  if (!currentShell || !currentRoot) {
    throw new Error('Current runtime shell is unavailable for SPA swap.');
  }

  copyAttributes(incomingShell, currentShell);
  currentShell.innerHTML = incomingShell.innerHTML;

  const nextRoot = document.querySelector('#tool-root[data-tool-root="true"]');
  if (!nextRoot) {
    throw new Error('Swapped runtime root was not found.');
  }

  document.title = incomingDocument.title || document.title;

  const incomingCanonical = incomingDocument.querySelector('link[rel="canonical"]');
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (incomingCanonical && canonicalLink) {
    canonicalLink.setAttribute('href', incomingCanonical.getAttribute('href') || window.location.href);
  }

  if (window.ToolNexusConfig?.tool) {
    window.ToolNexusConfig.tool.slug = slug;
  }

  const runtime = window.ToolNexusRuntime;
  if (runtime?.bootstrapToolRuntime) {
    await runtime.bootstrapToolRuntime();
  }

  controllerState.activeSlug = slug;
}

export async function loadTool(slug, { updateHistory = true } = {}) {
  if (!slug) {
    return;
  }

  if (controllerState.inFlightSlug === slug) {
    return;
  }

  const requestId = controllerState.activeRequestId + 1;
  controllerState.activeRequestId = requestId;
  controllerState.inFlightSlug = slug;

  const targetUrl = `/tools/${encodeURIComponent(slug)}`;
  try {
    const response = await fetch(targetUrl, {
      headers: {
        Accept: 'text/html',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'same-origin'
    });

    if (!response.ok) {
      throw new Error(`Tool load failed (${response.status}).`);
    }

    const htmlText = await response.text();

    if (requestId !== controllerState.activeRequestId) {
      return;
    }

    await swapToolShell(slug, htmlText);
  } finally {
    if (controllerState.activeRequestId === requestId) {
      controllerState.inFlightSlug = null;
    }
  }

  if (updateHistory) {
    window.history.pushState({ toolSlug: slug }, '', targetUrl);
  }
}

function installNavigationInterceptor() {
  document.addEventListener('click', (event) => {
    if (!isPlainLeftClick(event)) {
      return;
    }

    const link = event.target.closest?.('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) {
      return;
    }

    if (!document.querySelector('#tool-root[data-tool-root="true"]')) {
      return;
    }

    const slug = extractToolSlugFromLink(link);
    if (!slug) {
      return;
    }

    event.preventDefault();

    loadTool(slug).catch((error) => {
      console.warn('[shell-controller] navigation fallback to hard load.', {
        slug,
        message: error?.message ?? String(error)
      });
      window.location.assign(link.href);
    });
  });
}

function installPopStateHandler() {
  window.addEventListener('popstate', (event) => {
    const fallbackSlug = getSlugFromPath(window.location.pathname);
    const slug = event.state?.toolSlug ?? fallbackSlug;
    if (!slug) {
      return;
    }

    loadTool(slug, { updateHistory: false }).catch((error) => {
      console.warn('[shell-controller] popstate fallback to hard load.', {
        slug,
        message: error?.message ?? String(error)
      });
      window.location.assign(`/tools/${encodeURIComponent(slug)}`);
    });
  });
}

function initShellController() {
  if (controllerState.initialized) {
    return;
  }

  if (!document.querySelector('#tool-root[data-tool-root="true"]')) {
    return;
  }

  controllerState.initialized = true;
  controllerState.activeSlug = getSlugFromPath(window.location.pathname);

  window.history.replaceState(
    { ...(window.history.state ?? {}), toolSlug: controllerState.activeSlug },
    '',
    window.location.href
  );

  installNavigationInterceptor();
  installPopStateHandler();
}

initShellController();
