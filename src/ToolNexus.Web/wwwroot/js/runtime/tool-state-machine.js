const TRANSITIONS = Object.freeze({
  Discovered: ['Loaded'],
  Loaded: ['Activated'],
  Activated: ['Idle'],
  Idle: ['Suspended'],
  Suspended: ['Evicted'],
  Evicted: []
});

const STATE_ORDER = ['Discovered', 'Loaded', 'Activated', 'Idle', 'Suspended', 'Evicted'];
const machines = new Map();

function canTransition(fromState, toState) {
  return Array.isArray(TRANSITIONS[fromState]) && TRANSITIONS[fromState].includes(toState);
}

function requireMachine(toolId) {
  const slug = String(toolId ?? '').trim();
  if (!machines.has(slug)) {
    machines.set(slug, createToolStateMachine(slug));
  }

  return machines.get(slug);
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

  const machine = {
    toolId: slug,
    getState: () => state,
    getHistory: () => [...history],
    transition,
    canTransitionTo: (nextState) => canTransition(state, nextState)
  };

  machines.set(slug, machine);
  return machine;
}

function transitionTo(toolId, targetState) {
  const machine = requireMachine(toolId);
  const currentState = machine.getState();
  const currentIndex = STATE_ORDER.indexOf(currentState);
  const targetIndex = STATE_ORDER.indexOf(targetState);

  if (targetIndex === -1) {
    throw new Error(`[ToolStateMachine] Unknown target state: ${targetState}`);
  }

  for (let index = currentIndex + 1; index <= targetIndex; index += 1) {
    machine.transition(STATE_ORDER[index]);
  }

  return machine.getState();
}

export function activateTool(toolId) {
  return transitionTo(toolId, 'Activated');
}

export function suspendTool(toolId) {
  return transitionTo(toolId, 'Suspended');
}

export function evictTool(toolId) {
  return transitionTo(toolId, 'Evicted');
}

export function __resetToolStateMachinesForTests() {
  machines.clear();
}
