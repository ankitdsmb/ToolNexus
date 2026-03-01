const ROOT_FLOW_STATES = Object.freeze([
  'flow-state-first-run',
  'flow-state-active-loop',
  'flow-state-error-recovery',
  'flow-state-result-focus',
  'flow-state-input-focus',
  'flow-state-idle'
]);

const TOOLBAR_FLOW_ACTIVE_CLASS = 'toolbar-flow-active';
const TOOLBAR_FLOW_RECOVERY_CLASS = 'toolbar-flow-recovery';
const TOOLBAR_FLOW_COMPACT_CLASS = 'toolbar-flow-compact';

const EDITOR_RESULT_FOCUS_CLASS = 'editor-flow-result-focus';
const EDITOR_INPUT_FOCUS_CLASS = 'editor-flow-input-focus';

const DEFAULT_ACTIVE_LOOP_WINDOW_MS = 12000;
const DEFAULT_RESULT_FOCUS_DURATION_MS = 2200;
const DEFAULT_INPUT_FOCUS_DURATION_MS = 1500;
const DEFAULT_IDLE_TIMEOUT_MS = 30000;

function resolveKnownZones(root) {
  const shell = root?.matches?.('[data-tool-shell]') ? root : root?.querySelector?.('[data-tool-shell]') ?? root;
  const toolbarZone = shell?.querySelector?.('[data-tool-followup]') ?? null;
  const editorZone = shell?.querySelector?.('[data-tool-output]') ?? null;
  return { shell, toolbarZone, editorZone };
}

function normalizeExecutionState(state) {
  return String(state ?? '').trim().toLowerCase();
}

function mapExecutionStateKind(state) {
  const normalized = normalizeExecutionState(state);
  if (normalized === 'running' || normalized === 'streaming' || normalized === 'validating') {
    return 'execute';
  }

  if (normalized === 'success') {
    return 'success';
  }

  if (normalized === 'failed' || normalized === 'error') {
    return 'error';
  }

  return null;
}

export function createExecutionFlowIntelligence(root, options = {}) {
  if (!root || typeof root.classList?.add !== 'function') {
    return {
      state: 'idle',
      metrics: {
        executeCount: 0,
        editCount: 0,
        errorStreak: 0,
        successStreak: 0,
        idleDuration: 0
      },
      destroy: () => {},
      passive: true
    };
  }

  const emitTelemetry = options.emitTelemetry;
  const activeLoopWindowMs = Number(options.activeLoopWindowMs) || DEFAULT_ACTIVE_LOOP_WINDOW_MS;
  const resultFocusDurationMs = Number(options.resultFocusDurationMs) || DEFAULT_RESULT_FOCUS_DURATION_MS;
  const inputFocusDurationMs = Number(options.inputFocusDurationMs) || DEFAULT_INPUT_FOCUS_DURATION_MS;
  const idleTimeoutMs = Number(options.idleTimeoutMs) || DEFAULT_IDLE_TIMEOUT_MS;

  const now = () => Date.now();
  const { shell, toolbarZone, editorZone } = resolveKnownZones(root);

  const metrics = {
    executeCount: 0,
    editCount: 0,
    errorStreak: 0,
    successStreak: 0,
    idleDuration: 0
  };

  let currentState = 'idle';
  let lifecycleObserver = null;
  let idleTimer = null;
  let resultFocusTimer = null;
  let inputFocusTimer = null;
  let lastActivityAt = now();
  let executionTimestamps = [];

  const emitStateChange = (state, reason) => {
    if (typeof emitTelemetry !== 'function') {
      return;
    }

    emitTelemetry('runtime_flow_state_change', {
      toolSlug: options.toolSlug ?? null,
      state,
      reason,
      metadata: {
        ...metrics,
        idleDuration: metrics.idleDuration,
        activeLoopWindowMs,
        idleTimeoutMs
      }
    });
  };

  const clearFlowClasses = () => {
    for (const stateClass of ROOT_FLOW_STATES) {
      root.classList.remove(stateClass);
    }
  };

  const applyZoneClasses = (state) => {
    if (toolbarZone) {
      toolbarZone.classList.toggle(TOOLBAR_FLOW_ACTIVE_CLASS, state === 'active-loop');
      toolbarZone.classList.toggle(TOOLBAR_FLOW_RECOVERY_CLASS, state === 'error-recovery');
      toolbarZone.classList.toggle(TOOLBAR_FLOW_COMPACT_CLASS, state === 'active-loop' || state === 'idle');
    }

    if (editorZone) {
      editorZone.classList.toggle(EDITOR_RESULT_FOCUS_CLASS, state === 'result-focus');
      editorZone.classList.toggle(EDITOR_INPUT_FOCUS_CLASS, state === 'input-focus');
    }
  };

  const applyState = (state, reason) => {
    const normalized = String(state ?? '').trim().toLowerCase();
    const stateToken = normalized === 'idle' ? 'idle' : normalized;
    const stateClass = `flow-state-${stateToken}`;

    clearFlowClasses();
    root.classList.add(stateClass);
    applyZoneClasses(stateToken);

    if (currentState !== stateToken) {
      currentState = stateToken;
      emitStateChange(stateToken, reason);
    }

    return currentState;
  };

  const scheduleIdle = () => {
    if (idleTimer) {
      clearTimeout(idleTimer);
    }

    idleTimer = setTimeout(() => {
      metrics.idleDuration = Math.max(0, now() - lastActivityAt);
      executionTimestamps = [];
      applyState('idle', 'idle-timeout');
    }, idleTimeoutMs);
  };

  const markActivity = () => {
    lastActivityAt = now();
    metrics.idleDuration = 0;
    scheduleIdle();
  };

  const scheduleStateReset = (timerRefName, durationMs) => {
    if (timerRefName === 'result' && resultFocusTimer) {
      clearTimeout(resultFocusTimer);
    }

    if (timerRefName === 'input' && inputFocusTimer) {
      clearTimeout(inputFocusTimer);
    }

    const timer = setTimeout(() => {
      const hasErrorRecovery = metrics.errorStreak >= 2;
      const inActiveLoop = executionTimestamps.length >= 2;

      if (hasErrorRecovery) {
        applyState('error-recovery', 'error-streak');
      } else if (inActiveLoop) {
        applyState('active-loop', 'active-loop-window');
      } else {
        applyState('idle', 'focus-expired');
      }
    }, durationMs);

    if (timerRefName === 'result') {
      resultFocusTimer = timer;
    }

    if (timerRefName === 'input') {
      inputFocusTimer = timer;
    }
  };

  const handleInputActivity = () => {
    metrics.editCount += 1;
    markActivity();

    if (metrics.errorStreak >= 2) {
      applyState('error-recovery', 'error-streak');
      return;
    }

    applyState('input-focus', 'input-activity');
    scheduleStateReset('input', inputFocusDurationMs);
  };

  const consumeExecutionState = () => {
    const kind = mapExecutionStateKind(shell?.dataset?.executionState);
    if (!kind) {
      return;
    }

    markActivity();

    if (kind === 'execute') {
      metrics.executeCount += 1;
      const executionAt = now();
      executionTimestamps.push(executionAt);
      executionTimestamps = executionTimestamps.filter((ts) => executionAt - ts <= activeLoopWindowMs);

      if (metrics.executeCount === 1) {
        applyState('first-run', 'first-execution');
        return;
      }

      if (executionTimestamps.length >= 2) {
        applyState('active-loop', 'active-loop-window');
      }

      return;
    }

    if (kind === 'error') {
      metrics.errorStreak += 1;
      metrics.successStreak = 0;

      if (metrics.errorStreak >= 2) {
        applyState('error-recovery', 'error-streak');
      }

      return;
    }

    if (kind === 'success') {
      metrics.successStreak += 1;
      metrics.errorStreak = 0;
      applyState('result-focus', 'execution-success');
      scheduleStateReset('result', resultFocusDurationMs);
    }
  };

  const onInputEvent = (event) => {
    if (!shell || !event?.target || !shell.contains(event.target)) {
      return;
    }

    handleInputActivity();
  };

  root.addEventListener('input', onInputEvent, true);
  applyState('idle', 'initial');
  scheduleIdle();

  if (shell && typeof MutationObserver === 'function') {
    lifecycleObserver = new MutationObserver((mutations) => {
      const changedExecutionState = mutations.some((mutation) => mutation.attributeName === 'data-execution-state');
      if (changedExecutionState) {
        consumeExecutionState();
      }
    });

    lifecycleObserver.observe(shell, {
      attributes: true,
      attributeFilter: ['data-execution-state']
    });
  }

  return {
    get state() {
      return currentState;
    },
    get metrics() {
      return { ...metrics };
    },
    destroy() {
      lifecycleObserver?.disconnect();
      lifecycleObserver = null;
      root.removeEventListener('input', onInputEvent, true);
      clearTimeout(idleTimer);
      clearTimeout(resultFocusTimer);
      clearTimeout(inputFocusTimer);
      idleTimer = null;
      resultFocusTimer = null;
      inputFocusTimer = null;
    },
    passive: true
  };
}
