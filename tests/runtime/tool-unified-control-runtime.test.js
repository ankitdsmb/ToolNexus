import { describe, expect, test } from 'vitest';
import { createUnifiedToolControl, useUnifiedToolControl } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-unified-control-runtime.js';

describe('tool unified control runtime', () => {
  test('renders compact unified shell with icon fallback and expandable output', () => {
    const root = document.createElement('div');

    const control = createUnifiedToolControl({
      root,
      slug: 'json-formatter',
      manifest: { title: 'JSON Formatter' }
    });

    expect(root.querySelector('.tn-unified-tool-control')).not.toBeNull();
    expect(root.querySelector('.tn-unified-tool-control__icon').textContent).toBe('</>');

    control.renderResult({ ok: true, value: 'x'.repeat(800) });

    expect(control.preview.textContent.length).toBeLessThan(control.result.textContent.length);
    expect(control.details.hidden).toBe(false);
  });


  test('renders inside [data-tool-root] without replacing runtime container', () => {
    const host = document.createElement('div');
    host.innerHTML = `
      <section data-runtime-container="true">
        <div data-tool-root="true"><p data-sentinel>sentinel</p></div>
      </section>`;
    const runtimeContainer = host.querySelector('[data-runtime-container]');

    const control = createUnifiedToolControl({
      root: host,
      slug: 'json-formatter',
      manifest: { title: 'JSON Formatter' }
    });

    expect(control).not.toBeNull();
    expect(host.querySelector('[data-runtime-container]')).toBe(runtimeContainer);
    expect(host.querySelector('[data-sentinel]')).toBeNull();
    expect(host.querySelector('[data-tool-root] > .tn-unified-tool-control')).not.toBeNull();
  });

  test('adapter helper can consume runtime context object', () => {
    const root = document.createElement('div');
    const runtime = { root };

    const control = useUnifiedToolControl(runtime, {
      slug: 'api-tool',
      manifest: { icon: 'api', title: 'API Tool' }
    });

    expect(control).not.toBeNull();
    expect(root.textContent).toContain('API Tool');
    expect(root.querySelector('.tn-unified-tool-control__icon').textContent).toBe('API');
  });
});
