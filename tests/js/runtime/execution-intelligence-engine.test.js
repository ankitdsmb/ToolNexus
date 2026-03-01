import { applyExecutionIntelligence } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/intelligence/execution-intelligence-engine.js';

describe('execution intelligence engine', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('compact mode detection for low-complexity tools', () => {
    document.body.innerHTML = `
      <div data-tool-shell>
        <section class="tool-runtime-widget">
          <div class="tool-local-actions">
            <button data-action="execute">Run</button>
          </div>
          <input type="text" value="a" />
        </section>
      </div>
    `;

    const root = document.querySelector('[data-tool-shell]');
    const result = applyExecutionIntelligence(root);

    expect(result.mode).toBe('compact');
    expect(result.profile.widgetType).toBe('simple');
    expect(root.getAttribute('data-execution-mode')).toBe('compact');
  });

  test('editor-heavy detection resolves expanded mode for multi-editor workflows', () => {
    document.body.innerHTML = `
      <div data-tool-shell>
        <section class="tool-runtime-widget">
          <div class="tool-local-actions">
            <button data-action="execute">Run</button>
            <button data-action="validate">Validate</button>
            <button data-action="format">Format</button>
          </div>
          <textarea></textarea>
          <textarea></textarea>
        </section>
      </div>
    `;

    const root = document.querySelector('[data-tool-shell]');
    const result = applyExecutionIntelligence(root, {
      resolver: { focusPayloadThreshold: 99999 }
    });

    expect(result.profile.widgetType).toBe('workflow');
    expect(result.mode).toBe('expanded');
    expect(root.getAttribute('data-execution-mode')).toBe('expanded');
  });

  test('focus mode activation for large payload tools', () => {
    const largePayload = 'x'.repeat(15000);

    document.body.innerHTML = `
      <div data-tool-shell>
        <section class="tool-runtime-widget">
          <div class="tool-local-actions">
            <button data-action="execute">Run</button>
          </div>
          <textarea>${largePayload}</textarea>
        </section>
      </div>
    `;

    const root = document.querySelector('[data-tool-shell]');
    const telemetryEvents = [];
    const result = applyExecutionIntelligence(root, {
      toolSlug: 'json-formatter',
      emitTelemetry: (eventName, payload) => telemetryEvents.push({ eventName, payload })
    });

    expect(result.mode).toBe('focus');
    expect(root.getAttribute('data-execution-mode')).toBe('focus');
    expect(telemetryEvents).toEqual([
      expect.objectContaining({
        eventName: 'execution_intelligence_mode_selected',
        payload: expect.objectContaining({
          toolSlug: 'json-formatter',
          mode: 'focus'
        })
      })
    ]);
  });
});
