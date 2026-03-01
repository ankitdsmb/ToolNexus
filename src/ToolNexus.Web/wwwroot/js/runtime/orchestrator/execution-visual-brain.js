const ROOT_STATE_CLASSES = Object.freeze([
  'runtime-state-idle',
  'runtime-state-running',
  'runtime-state-success',
  'runtime-state-warning',
  'runtime-state-error'
]);

const TOOLBAR_ACTIVE_CLASS = 'toolbar-execution-active';
const TOOLBAR_RECOVERY_CLASS = 'toolbar-recovery-mode';
const EDITOR_RESULT_FOCUS_CLASS = 'editor-result-focus';

const COMPLETION_STATES = new Set(['success', 'warning', 'error']);

function mapExecutionStateToVisualState(state) {
  const normalized = String(state ?? '').trim().toLowerCase();

  if (normalized === 'running' || normalized === 'streaming' || normalized === 'validating') {
    return 'running';
  }

  if (normalized === 'warning' || normalized === 'uncertain') {
    return 'warning';
  }

  if (normalized === 'success') {
    return 'success';
  }

  if (normalized === 'failed' || normalized === 'error') {
    return 'error';
  }

  return 'idle';
}

function classForState(state) {
  return `runtime-state-${state}`;
}

function resolveKnownZones(root) {
  const shell = root?.matches?.('[data-tool-shell]') ? root : root?.querySelector?.('[data-tool-shell]') ?? root;
  const toolbarZone = shell?.querySelector?.('[data-tool-followup]') ?? null;
  const editorZone = shell?.querySelector?.('[data-tool-output]') ?? null;
  return { shell, toolbarZone, editorZone };
}

export function createExecutionVisualBrain(root, options = {}) {
  if (!root || typeof root.classList?.add !== 'function') {
    return {
      state: 'idle',
      applyState: () => 'idle',
      destroy: () => {},
      passive: true
    };
  }

  const emitTelemetry = options.emitTelemetry;
  const { shell, toolbarZone, editorZone } = resolveKnownZones(root);

  let currentState = 'idle';
  let observer = null;

  const emitStateChange = (state, lifecycleEvent) => {
    if (typeof emitTelemetry !== 'function') {
      return;
    }

    emitTelemetry('runtime_visual_brain_state_change', {
      toolSlug: options.toolSlug ?? null,
      state,
      lifecycleEvent,
      metadata: {
        stateClass: classForState(state)
      }
    });
  };

  const applyState = (nextState, lifecycleEvent = null) => {
    const normalized = mapExecutionStateToVisualState(nextState);

    for (const className of ROOT_STATE_CLASSES) {
      root.classList.toggle(className, className === classForState(normalized));
    }

    if (toolbarZone) {
      toolbarZone.classList.toggle(TOOLBAR_ACTIVE_CLASS, normalized === 'running');
      toolbarZone.classList.toggle(TOOLBAR_RECOVERY_CLASS, normalized === 'error');
    }

    if (editorZone) {
      editorZone.classList.toggle(EDITOR_RESULT_FOCUS_CLASS, COMPLETION_STATES.has(normalized));
    }

    if (normalized !== currentState) {
      currentState = normalized;
      emitStateChange(normalized, lifecycleEvent);
    }

    return normalized;
  };

  const consumeExecutionState = () => {
    const executionState = shell?.dataset?.executionState ?? 'idle';
    const visualState = mapExecutionStateToVisualState(executionState);

    let lifecycleEvent = 'idle reset';
    if (visualState === 'running') {
      lifecycleEvent = executionState === 'validating' ? 'validation complete' : 'execution start';
    } else if (visualState === 'success') {
      lifecycleEvent = 'success';
    } else if (visualState === 'warning') {
      lifecycleEvent = 'validation complete';
    } else if (visualState === 'error') {
      lifecycleEvent = 'error';
    }

    applyState(visualState, lifecycleEvent);
  };

  applyState('idle', 'idle reset');

  if (shell && typeof MutationObserver === 'function') {
    observer = new MutationObserver((mutations) => {
      const changedExecutionState = mutations.some((mutation) => mutation.attributeName === 'data-execution-state');
      if (changedExecutionState) {
        consumeExecutionState();
      }
    });

    observer.observe(shell, {
      attributes: true,
      attributeFilter: ['data-execution-state']
    });
  }

  return {
    get state() {
      return currentState;
    },
    applyState,
    destroy() {
      observer?.disconnect();
      observer = null;
    },
    passive: true
  };
}
