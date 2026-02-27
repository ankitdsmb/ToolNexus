import { describe, expect, test, beforeEach } from 'vitest';
import { createToolRuntime } from '../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';

function createObserver() {
  const listeners = new Set();
  return {
    emit(event, payload = {}) {
      for (const listener of listeners) {
        listener({
          event,
          toolSlug: payload.toolSlug ?? null,
          metadata: payload.metadata ?? {}
        });
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

describe('runtime lifecycle retry diagnostics overlay', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    window.ToolNexus = {};
    window.ToolNexusConfig = {};
  });

  test('shows lifecycle retry warning popup in admin/dev mode', async () => {
    const root = document.createElement('div');
    root.id = 'tool-root';
    document.body.appendChild(root);

    window.ToolNexusConfig = { isAdmin: true };
    const observer = createObserver();

    createToolRuntime({
      observer,
      getRoot: () => root
    });

    observer.emit('runtime_lifecycle_retry', {
      toolSlug: 'json-formatter',
      metadata: {
        slug: 'json-formatter',
        mode: 'legacy.init',
        originalError: 'init signature mismatch',
        retryStrategy: 'root-first'
      }
    });

    await Promise.resolve();

    const overlay = root.querySelector('[data-runtime-crash-overlay="true"]');
    expect(overlay).not.toBeNull();
    expect(overlay.textContent).toContain('LIFECYCLE RETRY DETECTED — tool init signature mismatch');
    expect(overlay.textContent).toContain('json-formatter');
    expect(overlay.textContent).toContain('init signature mismatch');
    expect(overlay.textContent).toContain('root-first');
  });
});
