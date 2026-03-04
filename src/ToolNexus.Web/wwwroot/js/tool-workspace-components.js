const PHASES = ['Idle', 'Validating', 'Running', 'Post-processing', 'Completed'];

const hotkeys = {
  run: () => document.querySelector('.tn-unified-tool-control__run, [data-command="run"]')?.click(),
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

  left.append(button('Run Tool', 'run', false, 'primary'));
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
    step.textContent = phase;
    host.append(step);
    if (index < PHASES.length - 1) {
      const sep = document.createElement('span');
      sep.textContent = '→';
      sep.setAttribute('aria-hidden', 'true');
      host.append(sep);
    }
  });
}

function updateTimeline(statusNode, host, start) {
  const runtimeState = (statusNode.dataset.executionState || statusNode.dataset.runtimeState || statusNode.textContent || 'idle').toLowerCase();
  const phase = runtimeState.includes('validat') ? 'validating'
    : runtimeState.includes('run') ? 'running'
      : runtimeState.includes('post') ? 'post-processing'
        : runtimeState.includes('complete') || runtimeState.includes('success') ? 'completed' : 'idle';

  host.querySelectorAll('.execution-timeline__step').forEach((step) => {
    step.classList.toggle('is-active', step.dataset.phase === phase);
  });

  const elapsed = Math.max(0, Math.round((Date.now() - start) / 1000));
  host.dataset.currentPhase = phase;
  host.dataset.elapsed = `${elapsed}s`;
}

function buildResultActions(host, output) {
  if (!host) return;
  host.innerHTML = '';
  const group = document.createElement('div');
  group.className = 'result-actions__group';
  group.append(button('Copy', 'copy', true));
  group.append(button('Download', 'download', true));
  group.append(button('Open in new window', 'open', true));
  group.append(button('Compare with previous run', 'compare', true));
  host.append(group);

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

function buildPalette(root) {
  const palette = document.createElement('dialog');
  palette.dataset.commandPalette = 'true';
  palette.innerHTML = '<form method="dialog"><p>Command palette</p><button value="close">Close</button></form>';
  root.append(palette);
}

function wireCommands(root) {
  root.addEventListener('click', (event) => {
    const action = event.target.closest('[data-command]');
    if (!action || action.disabled) return;
    if (action.dataset.command === 'run') hotkeys.run();
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
    if (ctrl && event.key === 'Enter') { event.preventDefault(); hotkeys.run(); }
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

  tabs.innerHTML = '<button type="button" data-tab="input">Input</button><button type="button" data-tab="output">Output</button><button type="button" data-tab="docs">Docs</button>';
  bar.innerHTML = '<button type="button" data-command="run">Run Tool</button><button type="button" data-command="copy">Copy Output</button><button type="button" data-command="palette">More actions</button>';

  tabs.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-tab]')?.dataset.tab;
    if (!tab) return;
    root.querySelector('.workspace-input')?.setAttribute('data-mobile-hidden', String(tab !== 'input'));
    root.querySelector('.workspace-output-panel')?.setAttribute('data-mobile-hidden', String(tab !== 'output'));
    root.querySelector('.workspace-knowledge-rail')?.setAttribute('data-mobile-hidden', String(tab !== 'docs'));
  });
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
  buildPalette(runtimeRoot);
  buildMobileTabs(runtimeRoot);
  wireCommands(runtimeRoot);

  const statusNode = runtimeRoot.querySelector('[data-tool-status="true"]');
  const start = Date.now();
  if (statusNode && timelineHost) {
    const observer = new MutationObserver(() => updateTimeline(statusNode, timelineHost, start));
    observer.observe(statusNode, { subtree: true, characterData: true, attributes: true, childList: true });
    updateTimeline(statusNode, timelineHost, start);
  }
});
