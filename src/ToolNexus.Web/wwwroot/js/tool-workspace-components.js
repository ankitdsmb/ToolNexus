const PHASES = ['idle', 'validating', 'running', 'post-processing', 'completed'];
const TERMINAL_STATES = new Set(['success', 'completed', 'warning', 'uncertain', 'failed', 'error']);

const hotkeys = {
  run: (root = document) => root.querySelector('.tn-unified-tool-control__run')?.click(),
  output: () => document.querySelector('[data-tool-output="true"]')?.focus(),
  input: () => document.querySelector('[data-tool-input="true"]')?.focus(),
  palette: () => document.querySelector('[data-command-palette="true"]')?.toggleAttribute('open'),
  fullscreenExit: () => document.querySelector('.tool-shell-page--fullscreen')?.classList.remove('tool-shell-page--fullscreen')
};

function button(label, command, disabled = false, variant = 'ghost') {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = `tool-btn tool-btn--${variant}`;
  node.textContent = label;
  node.dataset.command = command;
  node.disabled = disabled;
  return node;
}

function buildExecutionToolbar(host) {
  if (!host) return;
  host.classList.add('execution-toolbar-ready');
  const left = document.createElement('div');
  left.className = 'execution-toolbar__left';
  const right = document.createElement('div');
  right.className = 'execution-toolbar__right';

  left.append(button('Clear Input', 'clear'));
  left.append(button('Paste Example', 'example'));
  left.append(button('Swap Panels', 'swap'));
  left.append(button('Layout: Split', 'layout', false, 'secondary'));

  right.append(button('Copy Output', 'copy', true));
  right.append(button('Download Result', 'download', true));
  right.append(button('Share Link', 'share'));
  right.append(button('Fullscreen', 'fullscreen', false, 'secondary'));

  host.append(left, right);
}

function buildTimeline(host) {
  if (!host) return;
  host.innerHTML = '';
  PHASES.forEach((phase, index) => {
    const step = document.createElement('span');
    step.className = 'execution-timeline__step';
    if (index === 0) step.classList.add('is-active');
    step.dataset.phase = phase.toLowerCase();
    step.textContent = phase.charAt(0).toUpperCase() + phase.slice(1);
    host.append(step);
    if (index < PHASES.length - 1) {
      const sep = document.createElement('span');
      sep.textContent = '→';
      sep.setAttribute('aria-hidden', 'true');
      host.append(sep);
    }
  });
}

function updateTimeline(host, phase, elapsedSeconds) {
  host.querySelectorAll('.execution-timeline__step').forEach((step) => {
    step.classList.toggle('is-active', step.dataset.phase === phase);
  });
  host.dataset.currentPhase = phase;
  host.dataset.elapsed = `${elapsedSeconds}s`;
}

function buildResultActions(host, output) {
  if (!host) return;
  host.innerHTML = '';
  const title = document.createElement('h3');
  title.className = 'result-actions__title';
  title.textContent = 'Result';
  const group = document.createElement('div');
  group.className = 'result-actions__group';
  group.append(button('Copy', 'copy', true));
  group.append(button('Download', 'download', true));
  group.append(button('Open in new window', 'open', true));
  group.append(button('Compare with previous run', 'compare', true));
  host.append(title, group);

  const observer = new MutationObserver(() => {
    const hasOutput = (output?.textContent || '').trim().length > 0;
    host.hidden = !hasOutput;
    host.querySelectorAll('button').forEach((btn) => { btn.disabled = !hasOutput; });
  });
  observer.observe(output, { subtree: true, childList: true, characterData: true });
  host.hidden = true;
}

function buildRelatedTools(host) {
  if (!host) return;
  host.innerHTML = `<h3>Related tools</h3>
    <ul>
      <li><a href="#">JSON Validator</a></li>
      <li><a href="#">JSON → YAML Converter</a></li>
      <li><a href="#">JSON Minifier</a></li>
    </ul>`;
}

function createRuntimeStateStore(root, toastRegion) {
  const state = {
    phase: 'idle',
    startedAt: 0,
    progress: 0,
    hasExecuted: false
  };
  let raf = 0;
  let lastToastState = '';
  const subscribers = new Set();

  const notify = () => {
    raf = 0;
    const snapshot = { ...state };
    subscribers.forEach((subscriber) => subscriber(snapshot));
    root.dispatchEvent(new CustomEvent('toolnexus:runtime-state', { detail: snapshot }));
  };

  const enqueueNotify = () => {
    if (raf) return;
    raf = window.requestAnimationFrame(notify);
  };

  const publishToast = (phase) => {
    if (!toastRegion || !phase || phase === lastToastState) return;
    if (phase !== 'success' && phase !== 'error' && phase !== 'failed') return;
    const toast = document.createElement('div');
    toast.className = `tn-runtime-toast tn-runtime-toast--${phase === 'success' ? 'success' : 'error'}`;
    toast.textContent = phase === 'success' ? 'Execution completed.' : 'Execution failed. Review diagnostics.';
    toastRegion.append(toast);
    window.requestAnimationFrame(() => toast.classList.add('is-visible'));
    window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => toast.remove(), 240);
    }, 1800);
    lastToastState = phase;
  };

  return {
    subscribe(subscriber) {
      subscribers.add(subscriber);
      subscriber({ ...state });
      return () => subscribers.delete(subscriber);
    },
    setPhase(nextPhase) {
      const normalized = String(nextPhase || 'idle').trim().toLowerCase();
      if (!state.startedAt && normalized !== 'idle') {
        state.startedAt = Date.now();
      }
      if (normalized !== 'idle') {
        state.hasExecuted = true;
      }
      state.phase = normalized;
      if (normalized === 'validating') state.progress = 20;
      if (normalized === 'running' || normalized === 'streaming') state.progress = 60;
      if (normalized === 'post-processing') state.progress = 85;
      if (TERMINAL_STATES.has(normalized)) state.progress = 100;
      if (normalized === 'idle') {
        state.progress = 0;
        state.startedAt = 0;
      }
      publishToast(normalized);
      enqueueNotify();
    }
  };
}

function buildPalette(root) {
  const palette = document.createElement('dialog');
  palette.dataset.commandPalette = 'true';
  palette.innerHTML = '<form method="dialog"><p>Command palette</p><button value="close">Close</button></form>';
  root.append(palette);
}

function unifyPrimaryRunTriggers(root) {
  const triggers = root.querySelectorAll('[data-tool-primary-action]');
  triggers.forEach((trigger) => {
    trigger.dataset.command = 'run';
    trigger.dataset.runProxy = 'followup-dock';
    if (trigger.closest('[data-runtime-template-handoff="true"]')) {
      trigger.hidden = true;
      trigger.setAttribute('aria-hidden', 'true');
      trigger.setAttribute('tabindex', '-1');
    }
  });
}

function wireCommands(root) {
  root.addEventListener('click', (event) => {
    const action = event.target.closest('[data-command]');
    if (!action || action.disabled) return;
    if (action.dataset.command === 'run') hotkeys.run(root);
    if (action.dataset.command === 'swap') {
      const surface = root.querySelector('.execution-surface');
      const input = root.querySelector('[data-tool-input="true"]');
      const output = root.querySelector('.workspace-output-panel');
      if (surface && input && output) surface.append(output, input);
    }
    if (action.dataset.command === 'layout') {
      const surface = root.querySelector('.execution-surface');
      const stacked = surface?.dataset.layout === 'stacked';
      surface.dataset.layout = stacked ? 'split' : 'stacked';
      action.textContent = stacked ? 'Layout: Split' : 'Layout: Stacked';
    }
    if (action.dataset.command === 'fullscreen') {
      root.classList.toggle('tool-shell-page--fullscreen');
    }
    if (action.dataset.command === 'palette') {
      hotkeys.palette();
    }
  });

  document.addEventListener('keydown', (event) => {
    const ctrl = event.ctrlKey || event.metaKey;
    if (ctrl && event.key === 'Enter') { event.preventDefault(); hotkeys.run(root); }
    if (ctrl && event.key === '.') { event.preventDefault(); hotkeys.output(); }
    if (ctrl && event.key === ',') { event.preventDefault(); hotkeys.input(); }
    if (ctrl && event.key.toLowerCase() === 'k') { event.preventDefault(); hotkeys.palette(); }
    if (event.key === 'Escape') hotkeys.fullscreenExit();
  });
}

function buildMobileTabs(root) {
  const tabs = root.querySelector('[data-mobile-tabs="true"]');
  const bar = root.querySelector('[data-mobile-actionbar="true"]');
  if (!tabs || !bar) return;

  tabs.innerHTML = '<button type="button" role="tab" data-tab="input" id="mobile-tab-input" aria-controls="mobile-panel-input" aria-selected="true">Input</button><button type="button" role="tab" data-tab="output" id="mobile-tab-output" aria-controls="mobile-panel-output" aria-selected="false">Output</button><button type="button" role="tab" data-tab="diagnostics" id="mobile-tab-diagnostics" aria-controls="mobile-panel-diagnostics" aria-selected="false">Diagnostics</button><button type="button" role="tab" data-tab="docs" id="mobile-tab-docs" aria-controls="mobile-panel-docs" aria-selected="false">Docs</button>';
  bar.innerHTML = '<button type="button" data-command="run">Run Tool</button><button type="button" data-command="copy">Copy Output</button><button type="button" data-command="palette">More actions</button>';
  tabs.setAttribute('role', 'tablist');

  tabs.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-tab]')?.dataset.tab;
    if (!tab) return;
    tabs.querySelectorAll('[role="tab"]').forEach((node) => node.setAttribute('aria-selected', String(node.dataset.tab === tab)));
    root.querySelector('.workspace-input')?.setAttribute('data-mobile-hidden', String(tab !== 'input'));
    root.querySelector('.workspace-input')?.setAttribute('role', 'tabpanel');
    root.querySelector('.workspace-input')?.setAttribute('id', 'mobile-panel-input');
    root.querySelector('.workspace-output-panel')?.setAttribute('data-mobile-hidden', String(tab !== 'output' && tab !== 'diagnostics'));
    root.querySelector('.workspace-output-panel')?.setAttribute('role', 'tabpanel');
    root.querySelector('.workspace-output-panel')?.setAttribute('id', 'mobile-panel-output');
    root.querySelector('[data-tool-output="true"]')?.setAttribute('data-mobile-hidden', String(tab === 'diagnostics'));
    root.querySelector('.tn-unified-tool-control__diagnostics')?.setAttribute('data-mobile-hidden', String(tab !== 'diagnostics'));
    root.querySelector('.tn-unified-tool-control__diagnostics')?.setAttribute('id', 'mobile-panel-diagnostics');
    root.querySelector('.tn-unified-tool-control__diagnostics')?.setAttribute('role', 'tabpanel');
    root.querySelector('.workspace-knowledge-rail')?.setAttribute('data-mobile-hidden', String(tab !== 'docs'));
    root.querySelector('.workspace-knowledge-rail')?.setAttribute('role', 'tabpanel');
    root.querySelector('.workspace-knowledge-rail')?.setAttribute('id', 'mobile-panel-docs');
  });
  tabs.querySelector('[data-tab="input"]')?.click();
}

function normalizePhase(value) {
  const normalized = String(value || 'idle').toLowerCase();
  if (normalized.includes('validat')) return 'validating';
  if (normalized.includes('run') || normalized.includes('stream')) return 'running';
  if (normalized.includes('post')) return 'post-processing';
  if (normalized.includes('success') || normalized.includes('complete')) return 'success';
  if (normalized.includes('fail') || normalized.includes('error')) return 'error';
  return 'idle';
}

document.addEventListener('DOMContentLoaded', () => {
  const runtimeRoot = document.querySelector('#tool-root.tool-workspace-runtime');
  if (!runtimeRoot) return;

  runtimeRoot.querySelector('[data-tool-input="true"]')?.setAttribute('tabindex', '0');
  runtimeRoot.querySelector('[data-tool-output="true"]')?.setAttribute('tabindex', '0');

  buildExecutionToolbar(runtimeRoot.querySelector('[data-execution-toolbar="true"]'));
  const timelineHost = runtimeRoot.querySelector('[data-execution-timeline="true"]');
  buildTimeline(timelineHost);
  buildResultActions(runtimeRoot.querySelector('[data-result-actions="true"]'), runtimeRoot.querySelector('[data-tool-output="true"]'));
  buildRelatedTools(runtimeRoot.querySelector('[data-related-tools-rail="true"]'));
  runtimeRoot.querySelector('[data-tool-input="true"]')?.setAttribute('data-tool-component', 'ToolInputPanel');
  runtimeRoot.querySelector('.workspace-output-panel')?.setAttribute('data-tool-component', 'ToolOutputPanel');
  runtimeRoot.querySelector('[data-result-actions="true"]')?.setAttribute('data-tool-component', 'ToolResultActions');
  runtimeRoot.querySelector('.tn-unified-tool-control__errors, #errorBox')?.setAttribute('data-tool-component', 'ToolErrorPanel');
  buildPalette(runtimeRoot);
  unifyPrimaryRunTriggers(runtimeRoot);
  buildMobileTabs(runtimeRoot);
  wireCommands(runtimeRoot);

  const statusNode = runtimeRoot.querySelector('[data-tool-status="true"]');
  const docsRail = document.querySelector('[data-tool-docs="true"]');
  const toastRegion = runtimeRoot.querySelector('.tn-runtime-toast-region');
  const mobileStatusChip = runtimeRoot.querySelector('[data-mobile-status-chip="true"]');
  const store = createRuntimeStateStore(runtimeRoot, toastRegion);
  runtimeRoot.addEventListener('toolnexus:lifecycle', (event) => {
    store.setPhase(event.detail?.phase || 'idle');
  });
  if (statusNode && timelineHost) {
    const observer = new MutationObserver(() => {
      const phase = normalizePhase(statusNode.dataset.executionState || statusNode.dataset.runtimeState || statusNode.textContent);
      store.setPhase(phase);
    });
    observer.observe(statusNode, { subtree: true, characterData: true, attributes: true, childList: true });
  }

  store.subscribe((state) => {
    const elapsedSeconds = state.startedAt ? Math.max(0, Math.round((Date.now() - state.startedAt) / 1000)) : 0;
    const timelinePhase = state.phase === 'success' || state.phase === 'error' ? 'completed' : (state.phase === 'streaming' ? 'running' : state.phase);
    updateTimeline(timelineHost, timelinePhase, elapsedSeconds);
    runtimeRoot.dataset.runtimePhase = state.phase;
    runtimeRoot.dataset.runtimeProgress = String(state.progress);
    if (mobileStatusChip) {
      mobileStatusChip.textContent = state.phase;
      mobileStatusChip.dataset.phase = state.phase;
    }

    const toolbarUtilities = runtimeRoot.querySelectorAll('[data-execution-toolbar="true"] [data-command]');
    toolbarUtilities.forEach((node) => {
      node.hidden = !state.hasExecuted;
      node.disabled = !state.hasExecuted;
    });

    if (docsRail) {
      if (!state.hasExecuted) {
        docsRail.hidden = false;
      } else if (state.phase === 'success') {
        docsRail.hidden = true;
      } else if (state.phase === 'error' || state.phase === 'failed') {
        docsRail.hidden = false;
        docsRail.querySelector('[data-doc-section="Guidance"] details, [data-doc-section="Faq"] details')?.setAttribute('open', 'open');
      }
    }
  });

  if (statusNode) {
    const phase = normalizePhase(statusNode.dataset.executionState || statusNode.dataset.runtimeState || statusNode.textContent);
    store.setPhase(phase);
  }
});
