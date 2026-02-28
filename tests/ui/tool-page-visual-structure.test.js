// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { createUnifiedToolControl } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-unified-control-runtime.js';

function createToolShellFixture() {
  document.body.innerHTML = `
    <section id="tool-root" data-tool-shell="true">
      <header data-tool-context="true"></header>
      <section data-tool-input="true"></section>
      <section>
        <div data-tool-status="true"></div>
        <section data-tool-output="true"></section>
      </section>
      <footer data-tool-followup="true"></footer>
    </section>`;

  return document.getElementById('tool-root');
}

describe('tool page visual structure contract', () => {
  test('title hierarchy exists in tool identity context', () => {
    const root = createToolShellFixture();

    createUnifiedToolControl({
      root,
      slug: 'json-formatter',
      manifest: { title: 'JSON Formatter', description: 'Format and validate JSON', icon: 'json' }
    });

    const context = root.querySelector('[data-tool-context="true"]');
    expect(context?.querySelector('h2')).not.toBeNull();
    expect(context?.querySelector('p')).not.toBeNull();
  });

  test('run button remains primary visual action and secondary actions are grouped', () => {
    const root = createToolShellFixture();

    createUnifiedToolControl({ root, slug: 'json-formatter', manifest: { title: 'JSON Formatter' } });

    const runButton = root.querySelector('.tn-unified-tool-control__run');
    const primaryGroup = root.querySelector('.tn-unified-tool-control__actions-primary');
    const secondaryGroup = root.querySelector('.tn-unified-tool-control__actions-secondary');

    expect(runButton).not.toBeNull();
    expect(runButton?.classList.contains('tool-btn--primary')).toBe(true);
    expect(primaryGroup?.contains(runButton)).toBe(true);
    expect(secondaryGroup).not.toBeNull();
  });

  test('content section keeps article typography class and toolshell anchors remain unchanged', () => {
    const shellView = readFileSync('src/ToolNexus.Web/Views/Tools/ToolShell.cshtml', 'utf-8');

    expect(shellView).toContain('tool-article-prose');

    const requiredAnchors = [
      'data-tool-shell="true"',
      'data-tool-context="true"',
      'data-tool-input="true"',
      'data-tool-status="true"',
      'data-tool-output="true"',
      'data-tool-followup="true"'
    ];

    for (const anchor of requiredAnchors) {
      const count = shellView.split(anchor).length - 1;
      expect(count).toBe(1);
    }
  });
});
