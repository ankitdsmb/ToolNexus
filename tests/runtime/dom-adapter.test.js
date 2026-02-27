import { describe, expect, test } from 'vitest';
import { adaptToolDom } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-adapter.js';

describe('DOM adapter contract validation', () => {
  test('fails fast for legacy layout and reports compatibility mappings without mutation', () => {
    const root = document.createElement('div');
    root.className = 'tool-page';
    root.innerHTML = '<textarea id="inputEditor"></textarea><textarea id="outputEditor"></textarea>';

    const result = adaptToolDom(root, { slug: 'json-formatter' });

    expect(result.adapted).toBe(false);
    expect(result.contractViolation).toBe(true);
    expect(result.createdNodes).toEqual([]);
    expect(root.querySelector('[data-tool-shell]')).toBeNull();
    expect(result.legacyMappedNodes).toContain('data-tool-input');
  });
});
