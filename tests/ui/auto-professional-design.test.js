// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { createUnifiedToolControl } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-unified-control-runtime.js';
import { createToolPresentationEngine } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-presentation-engine.js';

function createFixture() {
  document.body.innerHTML = `
    <article class="tool-shell-page">
      <section id="tool-root" data-tool-shell="true">
        <header data-tool-context="true"></header>
        <section data-tool-input="true"></section>
        <section>
          <div data-tool-status="true"></div>
          <section data-tool-output="true"></section>
        </section>
        <footer data-tool-followup="true"></footer>
      </section>
      <aside class="tool-seo">
        <h2>Overview</h2>
        <p>Generated content</p>
      </aside>
    </article>`;

  return document.getElementById('tool-root');
}

describe('auto professional design', () => {
  test('injects identity header and action hierarchy automatically', () => {
    const root = createFixture();

    createUnifiedToolControl({
      root,
      slug: 'yaml-to-json',
      manifest: {
        title: 'YAML to JSON',
        description: 'Convert YAML payloads into JSON structures',
        icon: 'convert'
      }
    });

    const context = root.querySelector('[data-tool-context="true"]');
    expect(context?.querySelector('.tn-unified-tool-control__icon')).not.toBeNull();
    expect(context?.querySelector('h2')?.textContent).toContain('YAML to JSON');
    expect(context?.querySelector('.tn-unified-tool-control__meta')).not.toBeNull();

    const runButton = root.querySelector('.tn-unified-tool-control__run');
    const primaryActions = root.querySelector('.tn-unified-tool-control__actions-primary');
    const secondaryActions = root.querySelector('.tn-unified-tool-control__actions-secondary');
    expect(runButton?.classList.contains('tool-btn--primary')).toBe(true);
    expect(primaryActions?.contains(runButton)).toBe(true);
    expect(secondaryActions).not.toBeNull();
  });

  test('renders professional output hierarchy and supports graceful collapse', () => {
    const root = createFixture();

    createUnifiedToolControl({ root, slug: 'json-formatter', manifest: { title: 'JSON Formatter' } });

    const output = root.querySelector('[data-tool-output="true"]');
    expect(output?.querySelector('[data-output-tier="primary"]')).not.toBeNull();
    expect(output?.querySelector('[data-output-tier="supporting"]')).not.toBeNull();
    expect(output?.querySelector('[data-output-tier="metadata"]')).not.toBeNull();
    expect(output?.querySelector('[data-output-tier="diagnostics"]')).not.toBeNull();

    const engine = createToolPresentationEngine({ doc: document });
    engine.applyOutputVisibility({ outputHost: output, supporting: '', metadata: '', diagnostics: '' });

    expect(output?.querySelector('[data-output-tier="supporting"]')?.hidden).toBe(true);
    expect(output?.querySelector('[data-output-tier="metadata"]')?.hidden).toBe(true);
    expect(output?.querySelector('[data-output-tier="diagnostics"]')?.hidden).toBe(true);
  });

  test('applies article typography automatically for seo/tutorial content', () => {
    const root = createFixture();

    createUnifiedToolControl({ root, slug: 'markdown-to-html', manifest: { title: 'Markdown to HTML' } });

    const articleRail = document.querySelector('.tool-seo');
    expect(articleRail?.classList.contains('tool-article-prose')).toBe(true);
  });
});
