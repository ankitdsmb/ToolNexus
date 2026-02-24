import { describe, expect, test } from 'vitest';
import { adaptToolDom } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-adapter.js';
import { createToolExecutionContext } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-execution-context.js';

describe('runtime contract validation', () => {
  test('creates toolRootId and required nodes before lifecycle mount', () => {
    const page = document.createElement('article');
    page.className = 'tool-page';
    page.innerHTML = '<section class="tool-page__workspace"><textarea id="inputEditor"></textarea><div id="outputField"></div><button id="runBtn"></button></section>';

    const adapted = adaptToolDom(page, { slug: 'runtime-contract' });
    const root = page.querySelector('[data-tool-root="true"]');
    const context = createToolExecutionContext({ slug: 'runtime-contract', root, manifest: { slug: 'runtime-contract' } });

    expect(root).not.toBeNull();
    expect(root.dataset.toolRootId).toBeTruthy();
    expect(adapted.adaptedNodes).toContain('data-tool-actions');
    expect(adapted.adaptedNodes).toContain('data-runtime-container');
    expect(typeof context.addCleanup).toBe('function');
  });
});
