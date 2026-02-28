import { describe, expect, test } from 'vitest';
import { createUnifiedToolControl } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-unified-control-runtime.js';

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

describe('runtime execution action ux', () => {
  test('run action renders as primary and keeps secondary actions present', () => {
    const root = createContractHost();
    const control = createUnifiedToolControl({
      root,
      slug: 'json-formatter',
      manifest: { title: 'JSON Formatter' }
    });

    expect(control.runButton).not.toBeNull();
    expect(control.runButton.classList.contains('tool-btn--primary')).toBe(true);
    expect(control.runButton.textContent).toBe('Run Tool');
    expect(control.actions.querySelector('.tn-unified-tool-control__suggestion-badge')).not.toBeNull();
    expect(control.actions.querySelector('.tn-unified-tool-control__execution-hint')).not.toBeNull();
  });

  test('run label and runtime-state style respond to lifecycle states', () => {
    const root = createContractHost();
    const control = createUnifiedToolControl({
      root,
      slug: 'json-formatter',
      manifest: { title: 'JSON Formatter' }
    });

    control.setStatus('idle');
    expect(control.runButton.textContent).toBe('Run Tool');
    expect(control.runButton.dataset.runtimeState).toBe('idle');

    control.setStatus('validating');
    expect(control.runButton.textContent).toBe('Validating...');
    expect(control.runButton.dataset.runtimeState).toBe('validating');

    control.setStatus('running');
    expect(control.runButton.textContent).toBe('Running...');
    expect(control.runButton.dataset.runtimeState).toBe('running');

    control.setStatus('streaming');
    expect(control.runButton.textContent).toBe('Processing...');
    expect(control.runButton.dataset.runtimeState).toBe('streaming');

    control.setStatus('success');
    expect(control.runButton.textContent).toBe('Run Tool Again');
    expect(control.runButton.dataset.runtimeState).toBe('success');

    control.setStatus('warning');
    expect(control.runButton.textContent).toBe('Run Tool Again');
    expect(control.runButton.dataset.runtimeState).toBe('warning');

    control.setStatus('failed');
    expect(control.runButton.textContent).toBe('Retry Run');
    expect(control.runButton.dataset.runtimeState).toBe('failed');
  });
});
