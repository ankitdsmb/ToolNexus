import { jest } from '@jest/globals';
import { createExecutionFlowIntelligence } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/orchestrator/execution-flow-intelligence.js';

const FLOW_STATE_CLASSES = [
  'flow-state-first-run',
  'flow-state-active-loop',
  'flow-state-error-recovery',
  'flow-state-result-focus',
  'flow-state-input-focus',
  'flow-state-idle'
];

async function flushMutationObserver() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('runtime flow intelligence', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = `
      <div data-tool-shell>
        <section data-tool-input>
          <textarea data-input-field></textarea>
        </section>
        <section data-tool-output></section>
        <section data-tool-followup></section>
      </div>
    `;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  test('transitions through first-run, active-loop, error-recovery, result-focus, input-focus, and idle', async () => {
    const shell = document.querySelector('[data-tool-shell]');
    const events = [];

    createExecutionFlowIntelligence(shell, {
      emitTelemetry: (eventName, payload) => events.push({ eventName, payload }),
      idleTimeoutMs: 100,
      activeLoopWindowMs: 200,
      resultFocusDurationMs: 40,
      inputFocusDurationMs: 40
    });

    shell.dataset.executionState = 'running';
    await flushMutationObserver();
    expect(shell.classList.contains('flow-state-first-run')).toBe(true);

    shell.dataset.executionState = 'running';
    await flushMutationObserver();
    expect(shell.classList.contains('flow-state-active-loop')).toBe(true);
    expect(shell.querySelector('[data-tool-followup]').classList.contains('toolbar-flow-active')).toBe(true);

    shell.dataset.executionState = 'error';
    await flushMutationObserver();
    shell.dataset.executionState = 'error';
    await flushMutationObserver();
    expect(shell.classList.contains('flow-state-error-recovery')).toBe(true);
    expect(shell.querySelector('[data-tool-followup]').classList.contains('toolbar-flow-recovery')).toBe(true);

    shell.dataset.executionState = 'success';
    await flushMutationObserver();
    expect(shell.classList.contains('flow-state-result-focus')).toBe(true);
    expect(shell.querySelector('[data-tool-output]').classList.contains('editor-flow-result-focus')).toBe(true);

    const input = shell.querySelector('[data-input-field]');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(shell.classList.contains('flow-state-input-focus')).toBe(true);
    expect(shell.querySelector('[data-tool-output]').classList.contains('editor-flow-input-focus')).toBe(true);

    jest.advanceTimersByTime(120);
    expect(shell.classList.contains('flow-state-idle')).toBe(true);

    expect(events.some((entry) => entry.eventName === 'runtime_flow_state_change')).toBe(true);
  });

  test('enforces a single active flow-state class at a time', async () => {
    const shell = document.querySelector('[data-tool-shell]');

    createExecutionFlowIntelligence(shell, {
      idleTimeoutMs: 100,
      activeLoopWindowMs: 200
    });

    shell.dataset.executionState = 'running';
    await flushMutationObserver();
    shell.dataset.executionState = 'success';
    await flushMutationObserver();

    const activeStates = FLOW_STATE_CLASSES.filter((className) => shell.classList.contains(className));
    expect(activeStates).toHaveLength(1);
  });

  test('does not mutate DOM structure and keeps shell layout anchors unchanged', async () => {
    const shell = document.querySelector('[data-tool-shell]');
    const beforeChildCount = shell.children.length;
    createExecutionFlowIntelligence(shell, {
      idleTimeoutMs: 100,
      activeLoopWindowMs: 200
    });

    shell.dataset.executionState = 'running';
    await flushMutationObserver();
    shell.dataset.executionState = 'success';
    await flushMutationObserver();

    expect(shell.children.length).toBe(beforeChildCount);
    expect(shell.querySelectorAll('[data-tool-input]').length).toBe(1);
    expect(shell.querySelectorAll('[data-tool-output]').length).toBe(1);
    expect(shell.querySelectorAll('[data-tool-followup]').length).toBe(1);
  });
});
