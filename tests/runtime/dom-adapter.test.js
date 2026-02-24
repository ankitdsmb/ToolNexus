import { describe, expect, test } from 'vitest';
import { adaptToolDom } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-adapter.js';

describe('DOM adapter contract validation', () => {
  test('creates required runtime nodes for legacy layout', () => {
    const root = document.createElement('div');
    root.className = 'tool-page';
    root.innerHTML = '<textarea id="inputEditor"></textarea><textarea id="outputEditor"></textarea>';

    const result = adaptToolDom(root, { slug: 'json-formatter' });

    expect(result.adapted).toBe(true);
    expect(root.querySelector('[data-tool-root]')).not.toBeNull();
    expect(root.querySelector('[data-tool-input]')).not.toBeNull();
    expect(root.querySelector('[data-tool-output]')).not.toBeNull();
    expect(root.querySelector('[data-tool-actions]')).not.toBeNull();
    expect(root.querySelector('[data-tool-body]')?.style.minHeight).toBe('1px');
  });
});
