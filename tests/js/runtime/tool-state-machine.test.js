import {
  __resetToolStateMachinesForTests,
  activateTool,
  createToolStateMachine,
  evictTool,
  suspendTool
} from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-state-machine.js';

describe('tool state machine', () => {
  beforeEach(() => {
    __resetToolStateMachinesForTests();
  });

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

  test('helper transitions progress through prerequisite states', () => {
    expect(activateTool('css-minifier')).toBe('Activated');
    expect(suspendTool('css-minifier')).toBe('Suspended');
    expect(evictTool('css-minifier')).toBe('Evicted');
  });
});
