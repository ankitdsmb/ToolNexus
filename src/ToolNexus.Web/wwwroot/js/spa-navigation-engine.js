(function () {
    'use strict';

    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
    }

    var initialized = false;
    var inFlightNavigation = null;
    var SIMPLE_TOOLS = [
        'base64-encode',
        'case-converter',
        'json-minifier'
    ];

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

    function shouldUseSpaNavigation(href) {
        var destination;
        try {
            destination = new URL(href, window.location.href);
        } catch (_error) {
            return false;
        }

        if (!destination.pathname.startsWith('/tools/')) {
            return true;
        }

        var segments = destination.pathname.split('/').filter(function (segment) {
            return segment.length > 0;
        });
        var slug = segments.length > 1 ? segments[1] : '';

        return SIMPLE_TOOLS.indexOf(slug) !== -1;
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

        if (!shouldUseSpaNavigation(anchor.href)) {
            return;
        }

        event.preventDefault();

        loadAndSwap(anchor.href, true).catch(function () {
            window.location.assign(anchor.href);
        });
    }

    function handlePopState() {
        if (!shouldUseSpaNavigation(window.location.href)) {
            window.location.reload();
            return;
        }

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
