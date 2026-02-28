// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { createUnifiedToolControl } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-unified-control-runtime.js';

function renderToolShell() {
  document.body.innerHTML = `
    <article class="tool-shell-page">
      <section id="tool-root" class="tool-shell-page__runtime" data-tool-shell="true" data-tool-root="true">
        <header data-tool-context="true" data-tool-header="true" class="tn-tool-header"></header>
        <section data-tool-input="true" class="tn-tool-panel"></section>
        <section class="tn-tool-panel" aria-label="Tool output workspace">
          <div data-tool-status="true" class="tool-execution-status"></div>
          <section data-tool-output="true" aria-label="Tool output panel"></section>
        </section>
        <footer data-tool-followup="true" data-tool-actions="true" class="tool-execution-panel"></footer>
      </section>
      <aside class="tool-seo"><h2>Overview</h2><p>Doc content</p></aside>
    </article>`;

  return document.getElementById('tool-root');
}

describe('professional execution layout', () => {
  test('runtime workspace remains the primary container with left input and right output zones', () => {
    const root = renderToolShell();

    createUnifiedToolControl({ root, slug: 'json-formatter', manifest: { title: 'JSON Formatter' } });

    expect(root?.classList.contains('tn-unified-tool-control')).toBe(true);
    expect(root?.querySelector('[data-tool-input="true"]')).not.toBeNull();
    expect(root?.querySelector('[data-tool-output="true"]')).not.toBeNull();
  });

  test('run button keeps primary execution styling and status capsules are rendered', () => {
    const root = renderToolShell();

    createUnifiedToolControl({ root, slug: 'yaml-to-json', manifest: { title: 'YAML to JSON' } });

    const runButton = root?.querySelector('.tn-unified-tool-control__run');
    expect(runButton?.classList.contains('tool-btn--primary')).toBe(true);
    expect(runButton?.textContent).toBe('Run Tool');

    const capsules = root?.querySelectorAll('.tn-unified-tool-control__capsule');
    expect(capsules?.length).toBe(4);
  });

  test('content section typography class is applied and ToolShell anchors remain unchanged', () => {
    const root = renderToolShell();
    createUnifiedToolControl({ root, slug: 'markdown-to-html', manifest: { title: 'Markdown to HTML' } });

    const article = document.querySelector('.tool-seo');
    expect(article?.classList.contains('tool-article-prose')).toBe(true);

    const shellView = readFileSync('src/ToolNexus.Web/Views/Tools/ToolShell.cshtml', 'utf-8');
    const requiredAnchors = [
      'data-tool-shell="true"',
      'data-tool-root="true"',
      'data-tool-context="true"',
      'data-tool-input="true"',
      'data-tool-status="true"',
      'data-tool-output="true"',
      'data-tool-followup="true"'
    ];

    for (const anchor of requiredAnchors) {
      expect(shellView.includes(anchor)).toBe(true);
    }
  });
});
