import { applyExecutionDensityAutobalancer } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/orchestrator/execution-density-autobalancer.js';

describe('runtime density autobalancer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  function mountRuntime(markup) {
    document.body.innerHTML = markup;
    return document.querySelector('[data-tool-shell]');
  }

  test('applies density-tight for simple single-editor tool widgets', () => {
    const root = mountRuntime(`
      <section data-tool-shell>
        <div class="tool-runtime-widget" style="height: 420px;">
          <div class="tool-local-actions" style="width: 500px;">
            <button style="width: 80px;">Run</button>
            <button style="width: 80px;">Copy</button>
          </div>
          <textarea style="height: 180px;"></textarea>
        </div>
      </section>
    `);

    const result = applyExecutionDensityAutobalancer(root);
    const widget = root.querySelector('.tool-runtime-widget');

    expect(result.profile).toBe('density-tight');
    expect(widget.classList.contains('density-autobalanced')).toBe(true);
    expect(widget.classList.contains('density-tight')).toBe(true);
  });

  test('applies density-balanced and editor balancing for dual editor workspace', () => {
    const root = mountRuntime(`
      <section data-tool-shell style="height: 700px;">
        <div class="tool-runtime-widget" style="height: 560px;">
          <div class="tool-local-actions" style="width: 420px;">
            <button style="width: 120px;">Run</button>
            <button style="width: 120px;">Format</button>
          </div>
          <div class="tool-editor-panel" style="height: 220px;"></div>
          <div class="tool-editor-panel" style="height: 220px;"></div>
        </div>
      </section>
    `);

    const events = [];
    const result = applyExecutionDensityAutobalancer(root, {
      toolSlug: 'json-transform',
      emitTelemetry: (eventName, payload) => events.push({ eventName, payload })
    });

    const widget = root.querySelector('.tool-runtime-widget');
    expect(result.profile).toBe('density-balanced');
    expect(widget.classList.contains('density-balanced')).toBe(true);
    expect(widget.classList.contains('editor-balance-active')).toBe(true);
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        eventName: 'runtime_density_autobalanced',
        payload: expect.objectContaining({
          toolSlug: 'json-transform',
          profile: 'density-balanced',
          editorBalanceActive: true
        })
      })
    ]));
  });

  test('applies density-relaxed + toolbar compression for multi-panel pipeline and preserves shell contract', () => {
    const root = mountRuntime(`
      <section data-tool-shell>
        <div data-tool-context></div>
        <div data-tool-input></div>
        <div data-tool-status></div>
        <div data-tool-output></div>
        <div data-tool-followup></div>
        <div data-tool-content-host>
          <div class="tool-runtime-widget" style="height: 380px; overflow: auto;">
            <div class="tool-local-actions" style="width: 480px;">
              <button style="width: 100px;">Run</button>
              <button style="width: 100px;">Validate</button>
              <button style="width: 100px;">Diff</button>
              <button style="width: 100px;">Map</button>
              <button style="width: 100px;">Preview</button>
              <button style="width: 100px;">Export</button>
            </div>
            <div class="pipeline-workspace" data-workflow="pipeline"></div>
            <div class="tool-panel"></div>
            <div class="tool-panel"></div>
            <div class="tool-panel"></div>
            <div style="height: 950px;"></div>
          </div>
        </div>
      </section>
    `);

    const shellSnapshot = root.innerHTML;
    const result = applyExecutionDensityAutobalancer(root);
    const widget = root.querySelector('.tool-runtime-widget');

    expect(result.profile).toBe('density-relaxed');
    expect(widget.classList.contains('density-relaxed')).toBe(true);
    expect(widget.classList.contains('toolbar-compressed')).toBe(true);
    expect(root.querySelector('[data-tool-context]')).not.toBeNull();
    expect(root.querySelector('[data-tool-output]')).not.toBeNull();
    expect(root.querySelectorAll('.tool-runtime-widget').length).toBe(1);
    expect(root.innerHTML).not.toBe(shellSnapshot);
    expect(root.classList.contains('density-autobalanced')).toBe(false);
  });
});
