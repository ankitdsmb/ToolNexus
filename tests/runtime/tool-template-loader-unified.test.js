import { describe, expect, test } from 'vitest';
import { loadToolTemplate } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-template-loader.js';

describe('tool template loader unified control fallback', () => {
  test('renders unified control for generic loading templates', async () => {
    const root = document.createElement('div');

    await loadToolTemplate('json-formatter', root, {
      manifest: { title: 'JSON Formatter', icon: 'json' },
      config: { tool: { seoDescription: 'Format quickly.' } },
      fetchImpl: async () => ({
        ok: true,
        text: async () => '<section class="tool-generic-template">Loading json-formatter...</section>'
      })
    });

    expect(root.querySelector('.tn-unified-tool')).not.toBeNull();
    expect(root.querySelector('[data-tool-input]')).not.toBeNull();
    expect(root.querySelector('[data-tool-output]')).not.toBeNull();
    expect(root.querySelector('[data-tool-actions]')).not.toBeNull();
  });
});
