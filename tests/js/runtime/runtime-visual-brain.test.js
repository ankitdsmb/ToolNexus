import { createExecutionVisualBrain } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/orchestrator/execution-visual-brain.js';

function createShellFixture() {
  document.body.innerHTML = `
    <div id="tool-root">
      <div data-tool-shell>
        <section data-tool-input></section>
        <section data-tool-status></section>
        <section data-tool-output></section>
        <section data-tool-followup></section>
      </div>
    </div>
  `;

  const root = document.querySelector('[data-tool-shell]');
  const toolbar = root.querySelector('[data-tool-followup]');
  const output = root.querySelector('[data-tool-output]');
  return { root, toolbar, output };
}

describe('runtime visual brain', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('state classes switch correctly and keep one active class', () => {
    const { root } = createShellFixture();
    const visualBrain = createExecutionVisualBrain(root);

    visualBrain.applyState('running', 'execution start');
    expect(root.classList.contains('runtime-state-running')).toBe(true);
    expect(root.classList.contains('runtime-state-idle')).toBe(false);

    visualBrain.applyState('success', 'success');
    expect(root.classList.contains('runtime-state-success')).toBe(true);

    const activeStateCount = [
      'runtime-state-idle',
      'runtime-state-running',
      'runtime-state-success',
      'runtime-state-warning',
      'runtime-state-error'
    ].filter((className) => root.classList.contains(className)).length;

    expect(activeStateCount).toBe(1);
  });

  test('toolbar and editor intelligence classes are applied by lifecycle state', () => {
    const { root, toolbar, output } = createShellFixture();
    const visualBrain = createExecutionVisualBrain(root);

    visualBrain.applyState('running', 'execution start');
    expect(toolbar.classList.contains('toolbar-execution-active')).toBe(true);
    expect(toolbar.classList.contains('toolbar-recovery-mode')).toBe(false);

    visualBrain.applyState('error', 'error');
    expect(toolbar.classList.contains('toolbar-execution-active')).toBe(false);
    expect(toolbar.classList.contains('toolbar-recovery-mode')).toBe(true);

    visualBrain.applyState('success', 'success');
    expect(output.classList.contains('editor-result-focus')).toBe(true);
  });

  test('lifecycle observer updates state via data-execution-state and emits telemetry', async () => {
    const { root } = createShellFixture();
    const events = [];
    createExecutionVisualBrain(root, {
      emitTelemetry: (name, payload) => events.push({ name, payload })
    });

    root.dataset.executionState = 'running';
    await new Promise((resolve) => setTimeout(resolve, 0));

    root.dataset.executionState = 'failed';
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(root.classList.contains('runtime-state-running')).toBe(false);
    expect(root.classList.contains('runtime-state-error')).toBe(true);
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'runtime_visual_brain_state_change',
        payload: expect.objectContaining({ state: 'running' })
      }),
      expect.objectContaining({
        name: 'runtime_visual_brain_state_change',
        payload: expect.objectContaining({ state: 'error' })
      })
    ]));
  });

  test('does not mutate DOM structure and keeps shell layout unchanged', () => {
    const { root, toolbar, output } = createShellFixture();
    const childCountBefore = root.children.length;
    const toolbarNodeName = toolbar.nodeName;
    const outputNodeName = output.nodeName;

    const visualBrain = createExecutionVisualBrain(root);
    visualBrain.applyState('running', 'execution start');
    visualBrain.applyState('warning', 'validation complete');
    visualBrain.applyState('idle', 'idle reset');

    expect(root.children.length).toBe(childCountBefore);
    expect(root.querySelector('[data-tool-followup]').nodeName).toBe(toolbarNodeName);
    expect(root.querySelector('[data-tool-output]').nodeName).toBe(outputNodeName);
  });
});
