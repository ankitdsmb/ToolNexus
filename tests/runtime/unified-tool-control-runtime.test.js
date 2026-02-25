import { describe, expect, test } from 'vitest';
import { createUnifiedToolControlRuntime } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-unified-control-runtime.js';

describe('unified tool control runtime', () => {
  test('renders compact control with default icon fallback and expandable output', () => {
    const root = document.createElement('div');
    const runtime = createUnifiedToolControlRuntime({
      root,
      slug: 'demo-tool',
      manifest: { title: 'Demo Tool', description: 'Smart compact control.' }
    });

    expect(root.querySelector('.tn-unified-tool')).not.toBeNull();
    expect(root.querySelector('.tn-unified-tool__icon')?.textContent).toContain('{ }');

    const largeJson = JSON.stringify({ value: 'x'.repeat(1200) });
    runtime.applyOutput(largeJson);

    expect(root.querySelector('#outputInlinePreview')?.textContent?.length).toBeLessThanOrEqual(321);
    expect(root.querySelector('#outputExpand')?.hidden).toBe(false);
    expect(root.querySelector('#outputField')?.textContent).toContain('"value"');
  });

  test('provides opt-in unified rendering API for custom tools', () => {
    const root = document.createElement('div');
    const runtime = createUnifiedToolControlRuntime({
      root,
      slug: 'custom-tool',
      manifest: { title: 'Custom Tool' },
      render: false
    });

    expect(root.children.length).toBe(0);

    runtime.useUnifiedToolControl({ icon: 'code', runLabel: 'Execute' });

    expect(root.querySelector('.tn-unified-tool')).not.toBeNull();
    expect(root.querySelector('#runToolBtn')?.textContent).toBe('Execute');
  });
});
