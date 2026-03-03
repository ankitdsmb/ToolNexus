(function () {
    'use strict';

    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
    }

    var initialized = false;
    var inFlightNavigation = null;
    var heapTrendSamples = [];

    function isDevelopmentRuntime() {
        try {
            var config = window.ToolNexusConfig || {};
            var environment = String(config.environment || config.env || '').trim().toLowerCase();
            return environment === 'development' || environment === 'dev' || environment === 'test' || environment === 'testing';
        } catch (_error) {
            return false;
        }
    }

    function ensureNavigationMetrics() {
        if (!window.__spaNavigationMetrics || typeof window.__spaNavigationMetrics !== 'object') {
            window.__spaNavigationMetrics = {
                navigationCount: 0,
                lastNavigationTs: 0
            };
        }

        if (typeof window.__spaNavigationMetrics.navigationCount !== 'number') {
            window.__spaNavigationMetrics.navigationCount = 0;
        }

        if (typeof window.__spaNavigationMetrics.lastNavigationTs !== 'number') {
            window.__spaNavigationMetrics.lastNavigationTs = 0;
        }

        return window.__spaNavigationMetrics;
    }

    function recordNavigationMetrics() {
        try {
            var metrics = ensureNavigationMetrics();
            metrics.navigationCount += 1;
            metrics.lastNavigationTs = Date.now();
        } catch (_error) {
            // telemetry-only: never throw
        }
    }

    function verifyToolShellCount() {
        try {
            var toolShellCount = document.querySelectorAll('[data-tool-shell]').length;
            if (toolShellCount > 1) {
                console.warn('[ToolNexus SPA] Multiple [data-tool-shell] elements detected after navigation swap.', {
                    count: toolShellCount,
                    href: window.location.href
                });
            }
        } catch (_error) {
            // guard-only: never throw
        }
    }

    function recordHeapTrend() {
        if (!isDevelopmentRuntime()) {
            return;
        }

        try {
            if (!window.performance || !window.performance.memory || typeof window.performance.memory.usedJSHeapSize !== 'number') {
                return;
            }

            heapTrendSamples.push(window.performance.memory.usedJSHeapSize);
            if (heapTrendSamples.length > 6) {
                heapTrendSamples.shift();
            }

            if (heapTrendSamples.length < 4) {
                return;
            }

            var recent = heapTrendSamples.slice(-4);
            var isIncreasing = true;
            for (var i = 1; i < recent.length; i += 1) {
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
        } catch (_error) {
            // telemetry-only: never throw
        }
    }

    function getAppRoot(doc) {
        return doc.getElementById('app-page-root');
    }

    function isHashOnlyNavigation(url) {
        return url.pathname === window.location.pathname &&
            url.search === window.location.search &&
            url.hash !== '';
    }

    function isInterceptableAnchor(anchor) {
        if (!anchor || anchor.tagName !== 'A') {
            return false;
        }

        if (anchor.target && anchor.target.toLowerCase() === '_blank') {
            return false;
        }

        if (anchor.hasAttribute('download')) {
            return false;
        }

        if (!anchor.href) {
            return false;
        }

        var destination;
        try {
            destination = new URL(anchor.href, window.location.href);
        } catch (_error) {
            return false;
        }

        if (destination.origin !== window.location.origin) {
            return false;
        }

        if (isHashOnlyNavigation(destination)) {
            return false;
        }

        return true;
    }

    async function loadAndSwap(url, pushHistory) {
        if (inFlightNavigation && inFlightNavigation.url === url) {
            return inFlightNavigation.promise;
        }

        var navigationTask = (async function () {
            var response = await fetch(url, {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'X-Requested-With': 'ToolNexusSpaNavigation'
                }
            });

            if (!response.ok) {
                throw new Error('Navigation fetch failed with status ' + response.status + '.');
            }

            var html = await response.text();
            var parsed = new DOMParser().parseFromString(html, 'text/html');
            var incomingRoot = getAppRoot(parsed);
            var currentRoot = getAppRoot(document);

            if (!incomingRoot || !currentRoot) {
                throw new Error('Missing #app-page-root during SPA navigation swap.');
            }

            currentRoot.innerHTML = incomingRoot.innerHTML;
            document.title = parsed.title || document.title;

            recordNavigationMetrics();
            verifyToolShellCount();
            recordHeapTrend();

            if (pushHistory) {
                window.history.pushState({ spa: true }, '', url);
            }
        })();

        inFlightNavigation = { url: url, promise: navigationTask };

        try {
            await navigationTask;
        } finally {
            if (inFlightNavigation && inFlightNavigation.promise === navigationTask) {
                inFlightNavigation = null;
            }
        }
    }

    function handleDocumentClick(event) {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }

        var anchor = event.target && event.target.closest ? event.target.closest('a') : null;
        if (!isInterceptableAnchor(anchor)) {
            return;
        }

        event.preventDefault();

        loadAndSwap(anchor.href, true).catch(function () {
            window.location.assign(anchor.href);
        });
    }

    function handlePopState() {
        loadAndSwap(window.location.href, false).catch(function () {
            window.location.reload();
        });
    }

    window.ToolNexusSpa = {
        init: function init() {
            if (initialized) {
                return;
            }

            ensureNavigationMetrics();

            initialized = true;
            document.addEventListener('click', handleDocumentClick);
            window.addEventListener('popstate', handlePopState);
        }
    };
})();
