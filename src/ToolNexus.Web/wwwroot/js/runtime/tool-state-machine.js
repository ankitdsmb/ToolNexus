const TRANSITIONS = Object.freeze({
  Discovered: ['Loaded'],
  Loaded: ['Activated'],
  Activated: ['Idle'],
  Idle: ['Suspended'],
  Suspended: ['Evicted'],
  Evicted: []
});

function canTransition(fromState, toState) {
  return Array.isArray(TRANSITIONS[fromState]) && TRANSITIONS[fromState].includes(toState);
}

export function createToolStateMachine(toolId) {
  const slug = String(toolId ?? '').trim();
  let state = 'Discovered';
  const history = [{ state, at: Date.now() }];

  const transition = (nextState) => {
    if (!canTransition(state, nextState)) {
      throw new Error(`[ToolStateMachine] Invalid transition for "${slug}": ${state} -> ${nextState}`);
    }

    state = nextState;
    history.push({ state, at: Date.now() });
    return state;
  };

  return {
    toolId: slug,
    getState: () => state,
    getHistory: () => [...history],
    transition,
    canTransitionTo: (nextState) => canTransition(state, nextState)
  };
}
