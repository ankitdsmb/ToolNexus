import { createToolStateMachine } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-state-machine.js';

describe('tool state machine', () => {
  test('supports valid transition path', () => {
    const machine = createToolStateMachine('css-minifier');

    machine.transition('Loaded');
    machine.transition('Activated');
    machine.transition('Idle');
    machine.transition('Suspended');
    machine.transition('Evicted');

    expect(machine.getState()).toBe('Evicted');
    expect(machine.getHistory().map((entry) => entry.state)).toEqual([
      'Discovered',
      'Loaded',
      'Activated',
      'Idle',
      'Suspended',
      'Evicted'
    ]);
  });

  test('rejects invalid transitions', () => {
    const machine = createToolStateMachine('css-minifier');
    expect(() => machine.transition('Activated')).toThrow('Invalid transition');
  });
});
