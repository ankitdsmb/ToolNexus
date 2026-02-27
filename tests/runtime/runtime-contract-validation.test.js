import { describe, expect, test } from 'vitest';
import { adaptToolDom } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-adapter.js';
import { createToolExecutionContext } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-execution-context.js';

describe('runtime contract validation', () => {
  test('fails fast when required canonical anchors are missing', () => {
    const page = document.createElement('article');
    page.className = 'tool-page';
    page.innerHTML = '<section class="tool-page__workspace"><textarea id="inputEditor"></textarea><div id="outputField"></div><button id="runBtn"></button></section>';

    const adapted = adaptToolDom(page, { slug: 'runtime-contract' });
    const context = createToolExecutionContext({ slug: 'runtime-contract', root: page, manifest: { slug: 'runtime-contract' } });

    expect(adapted.contractViolation).toBe(true);
    expect(adapted.missingNodes).toContain('data-tool-shell');
    expect(adapted.createdNodes).toEqual([]);
    expect(typeof context.addCleanup).toBe('function');
  });
});
