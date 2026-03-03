(function () {
    'use strict';

    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
    }

    var initialized = false;
    var inFlightNavigation = null;
    var runtimeBootstrapGeneration = 0;

    function logError(message, error) {
        console.error('[ToolNexusSpa] ' + message, error);
    }

    function warnOnDuplicateToolShells() {
        var toolShellCount = document.querySelectorAll('[data-tool-shell]').length;
        if (toolShellCount > 1) {
            console.warn('[ToolNexusSpa] Multiple [data-tool-shell] elements detected (' + toolShellCount + ').');
        }
    }

    function runRuntimeCleanup() {
        if (typeof window.ToolNexusRuntimeCleanup !== 'function') {
            return;
        }

        try {
            window.ToolNexusRuntimeCleanup();
        } catch (error) {
            logError('Runtime cleanup failed before DOM swap.', error);
        }
    }

    function bootstrapRuntimeOnceForSwap(swapGeneration) {
        if (typeof window.bootstrapToolRuntime !== 'function') {
            return;
        }

        if (runtimeBootstrapGeneration === swapGeneration) {
            return;
        }

        runtimeBootstrapGeneration = swapGeneration;
        window.bootstrapToolRuntime();
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

            runRuntimeCleanup();
            currentRoot.innerHTML = incomingRoot.innerHTML;
            document.title = parsed.title || document.title;
            warnOnDuplicateToolShells();
            bootstrapRuntimeOnceForSwap(Date.now());

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

            initialized = true;
            document.addEventListener('click', handleDocumentClick);
            window.addEventListener('popstate', handlePopState);
        }
    };
})();
