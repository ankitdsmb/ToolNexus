import { describe, expect, test } from 'vitest';
import { buildAdaptiveGuidance, createUnifiedToolControl, useUnifiedToolControl } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-unified-control-runtime.js';

function createContractHost() {
  const host = document.createElement('div');
  host.innerHTML = `
    <section data-tool-shell="true">
      <header data-tool-context="true"></header>
      <section data-tool-input="true"></section>
      <section data-tool-status="true"></section>
      <section data-tool-output="true"></section>
      <footer data-tool-followup="true"></footer>
    </section>`;
  return host;
}

describe('tool unified control runtime', () => {
  test('renders compact unified shell with icon fallback and expandable output', () => {
    const root = createContractHost();

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


  test('renders inside [data-tool-shell] without replacing canonical shell', () => {
    const host = document.createElement('div');
    host.innerHTML = `
      <section data-tool-shell="true">
        <header data-tool-context="true"></header>
        <section data-tool-input="true"><p data-sentinel>sentinel</p></section>
        <section data-tool-status="true"></section>
        <section data-tool-output="true"></section>
        <footer data-tool-followup="true"></footer>
      </section>`;
    const runtimeContainer = host.querySelector('[data-tool-shell]');

    const control = createUnifiedToolControl({
      root: host,
      slug: 'json-formatter',
      manifest: { title: 'JSON Formatter' }
    });

    expect(control).not.toBeNull();
    expect(host.querySelector('[data-tool-shell]')).toBe(runtimeContainer);
    expect(host.querySelector('[data-sentinel]')).toBeNull();
    expect(host.querySelector('[data-tool-shell].tn-unified-tool-control')).not.toBeNull();
  });


  test('classifies warning_partial and uncertain_result outcomes for adaptive runtime wording', () => {
    const root = createContractHost();
    const control = createUnifiedToolControl({
      root,
      slug: 'json-formatter',
      manifest: { title: 'JSON Formatter' }
    });

    const warningHierarchy = control.renderResult({
      output: { normalized: true },
      warnings: ['w1'],
      diagnostics: { traceId: 'abc' },
      metadata: { runId: '1' }
    });
    expect(warningHierarchy.outcomeClass).toBe('warning_partial');
    expect(root.textContent).toContain('Cautious');

    const uncertainHierarchy = control.renderResult({
      output: { maybe: true },
      diagnostics: { note: 'missing context' }
    });
    expect(uncertainHierarchy.outcomeClass).toBe('uncertain_result');
    expect(root.textContent).toContain('Limited');
  });

  test('buildAdaptiveGuidance returns guidance variants by outcome class', () => {
    expect(buildAdaptiveGuidance({ outcomeClass: 'usable_success', repeatedWarning: false }).guidance).toContain('continue through follow-up actions');
    expect(buildAdaptiveGuidance({ outcomeClass: 'warning_partial', repeatedWarning: true }).guidance).toContain('recurring warning pattern');
    expect(buildAdaptiveGuidance({ outcomeClass: 'uncertain_result', repeatedWarning: false }).guidance).toContain('trusted reference');
  });

  test('adapter helper can consume runtime context object', () => {
    const root = createContractHost();
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
