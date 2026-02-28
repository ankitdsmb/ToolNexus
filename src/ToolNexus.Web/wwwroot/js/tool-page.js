import { loadMonaco } from '/js/runtime/monaco-loader.js';
import { normalizeToolExecutionPayload } from './runtime/runtime-safe-tool-wrapper.js';
import { runtimeIncidentReporter } from './runtime/runtime-incident-reporter.js';
import { createRuntimeLogger } from './runtime/runtime-logger.js';
import {
  normalizeToolPageExecutionResult,
  TOOL_PAGE_RUNTIME_FALLBACK_MESSAGE
} from './runtime/tool-page-result-normalizer.js';
import { createToolIntelligenceEngine } from './runtime/tool-intelligence-engine.js';

document.addEventListener('DOMContentLoaded', () => {
const logger = createRuntimeLogger({ source: 'tool-page' });
const page = document.querySelector('.tool-page');

if (!page) {
  logger.debug('Not on tool page, skipping initialization.');
  return;
}

const slug = page.dataset.slug ?? '';
const apiBase = window.ToolNexusConfig?.apiBaseUrl ?? '';
const toolExecutionPathPrefix = normalizePathPrefix(window.ToolNexusConfig?.toolExecutionPathPrefix ?? '/api/v1/tools');

const STORAGE_KEYS = {
  recentTools: 'toolnexus.recentTools',
  pinnedTools: 'toolnexus.pinnedTools',
  recentJson: 'toolnexus.recentJson',
  collections: 'toolnexus.toolCollections',
  history: 'toolnexus.toolHistory',
  session: `toolnexus.session.${slug}`
};

const MAX_HISTORY = 25;
const MAX_RECENT = 8;

function ensureElement(id, tagName, options = {}) {
  const existing = document.getElementById(id);
  if (existing) {
    return existing;
  }

  const node = document.createElement(tagName);
  node.id = id;
  if (options.hidden) {
    node.hidden = true;
  }
  if (options.className) {
    node.className = options.className;
  }

  const parent = options.parent ?? page;
  parent?.appendChild(node);
  return node;
}

function ensureEditorContract() {
  if (!page.dataset.toolRootId) {
    page.dataset.toolRootId = `tool-page-${slug || 'runtime'}-${Math.random().toString(16).slice(2)}`;
  }

  const editorHost = page.querySelector('.tool-layout, .tool-shell-page__workspace, .tool-page__workspace, article, section') ?? page;
  const fallbackExecutionPanel = ensureElement('toolExecutionPanel', 'section', {
    parent: editorHost,
    hidden: true,
    className: 'tool-execution-panel tool-execution-panel--fallback'
  });

  const fallbackInput = ensureElement('inputEditor', 'textarea', { parent: fallbackExecutionPanel, hidden: true });
  const fallbackOutput = ensureElement('outputEditor', 'textarea', { parent: fallbackExecutionPanel, hidden: true });
  const fallbackOutputField = ensureElement('outputField', 'div', { parent: fallbackExecutionPanel, hidden: true });

  ensureElement('inputEditorSurface', 'div', { parent: fallbackExecutionPanel, hidden: true, className: 'editor-surface' });
  ensureElement('outputEditorSurface', 'div', { parent: fallbackOutputField, hidden: true, className: 'editor-surface' });
  ensureElement('runBtn', 'button', { parent: fallbackExecutionPanel, hidden: true });

  return {
    inputTextArea: fallbackInput,
    outputTextArea: fallbackOutput
  };
}

const contractNodes = ensureEditorContract();
const inputTextArea = contractNodes.inputTextArea;
const outputTextArea = contractNodes.outputTextArea;
const actionSelect = document.getElementById('actionSelect');
const inputEditorSurface = ensureElement('inputEditorSurface', 'div', { parent: page, hidden: true, className: 'editor-surface' });
const outputEditorSurface = ensureElement('outputEditorSurface', 'div', { parent: page, hidden: true, className: 'editor-surface' });

const runBtn = document.getElementById('runBtn');
const runBtnLabel = runBtn?.querySelector('.tool-btn__label');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const shareBtn = document.getElementById('shareBtn');

const collectionNameInput = document.getElementById('collectionNameInput');
const saveCollectionBtn = document.getElementById('saveCollectionBtn');
const uxPinnedRecent = document.getElementById('uxPinnedRecent');
const uxHistory = document.getElementById('uxHistory');
const uxCollections = document.getElementById('uxCollections');
const workflowRelatedTools = document.getElementById('workflowRelatedTools');
const workflowPathways = document.getElementById('workflowPathways');
const smartContextHint = document.getElementById('smartContextHint');
const workflowContinueBtn = document.getElementById('workflowContinueBtn');
const workflowCompletionSignal = document.getElementById('workflowCompletionSignal');

const errorMessage = document.getElementById('errorMessage');
const resultStatus = document.getElementById('resultStatus');
const runtimeStatusBand = document.getElementById('runtimeStatusBand');
const detectedFormatBadge = document.getElementById('detectedFormatBadge');
const confidenceBadge = document.getElementById('confidenceBadge');
const contextHints = document.getElementById('contextHints');
const suggestionChips = document.getElementById('suggestionChips');
const outputField = document.getElementById('outputField');
const outputEmptyState = document.getElementById('outputEmptyState');
const emptyStateTitle = document.getElementById('emptyStateTitle');
const emptyStateHint = document.getElementById('emptyStateHint');
const emptyStateExample = document.getElementById('emptyStateExample');
const quickRunBtn = document.getElementById('quickRunBtn');
const toolOutputHeading = document.getElementById('toolOutputHeading');
const toastRegion = document.getElementById('toastRegion');

let isRunning = false;
let inputEditor = null;
let outputEditor = null;
let currentEditorType = 'textarea';
let persistTimer = 0;
let pendingLayoutFrame = 0;
let monacoRuntime = null;
let lastExecutionDurationMs = 0;
let lastErrorMessage = '';
let emptyStateTimer = 0;

const intelligenceEngine = createToolIntelligenceEngine();
const dismissedHintIds = new Set(readStorageJson(`toolnexus.intel.dismissed.${slug}`, []));

const TOOL_INTELLIGENCE_GRAPH = {
  json: ['json-validator', 'json-to-csv', 'json-to-yaml', 'yaml-to-json'],
  csv: ['csv-to-json', 'json-to-csv', 'file-merge'],
  format: ['json-validator', 'xml-formatter', 'sql-formatter'],
  encode: ['url-decode', 'base64-decode', 'html-entities'],
  decode: ['url-encode', 'base64-encode', 'html-entities'],
  text: ['regex-tester', 'text-diff', 'case-converter']
};

init().catch((error) => {
  logger.error('Tool page initialization failed.', { error: error?.message ?? String(error) });
  showToast('Editor initialization failed. Using basic mode.', 'warning');
});

async function init() {
  await loadToolModule();
  await initializeEditors();
  hydrateFromUrl();
  hydrateSession();
  writeRecentTool(slug);

  setOutputState(false);
  setRunningState(false);
  applyEditorTheme();
  bindEvents();
  renderUxLists();
  renderWorkflowIntelligence();
  renderIntelligenceLayer();
  initializeAdaptiveToolbar();
  evolveEmptyState();

  window.ToolNexusRun = run;
}

async function loadToolModule() {
  if (!slug) return;

  try {
    await import(`./tools/${slug}.js`);
  } catch (error) {
    // Not every server-backed tool has a dedicated client enhancer module.
    logger.debug(`No dedicated tool module loaded for "${slug}".`, { error: error?.message ?? String(error) });
  }
}

async function initializeEditors() {
  monacoRuntime = await loadMonaco();
  const monacoLoaded = Boolean(monacoRuntime?.editor);

  if (monacoLoaded) {
    currentEditorType = 'monaco';
    inputTextArea.hidden = true;
    outputTextArea.hidden = true;

    inputEditor = monacoRuntime.editor.create(inputEditorSurface, {
      value: inputTextArea.value || '',
      language: 'json',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      scrollBeyondLastLine: false,
      roundedSelection: false
    });

    outputEditor = monacoRuntime.editor.create(outputEditorSurface, {
      value: '',
      language: 'json',
      readOnly: true,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      scrollBeyondLastLine: false,
      roundedSelection: false
    });

    return;
  }

  console.warn('[tool] Monaco unavailable → fallback editor');

  const codeMirrorReady = await loadCodeMirror();

  if (codeMirrorReady && typeof CodeMirror !== 'undefined') {
    currentEditorType = 'codemirror';
    inputEditor = CodeMirror.fromTextArea(inputTextArea, {
      lineNumbers: true,
      mode: 'application/json',
      theme: 'default'
    });

    outputEditor = CodeMirror.fromTextArea(outputTextArea, {
      lineNumbers: true,
      mode: 'application/json',
      readOnly: true,
      theme: 'default'
    });

    return;
  }

  currentEditorType = 'textarea';
  inputEditor = {
    getValue: () => inputTextArea.value,
    setValue: (v) => { inputTextArea.value = v; },
    focus: () => inputTextArea.focus(),
    refresh: () => {}
  };
  outputEditor = {
    getValue: () => outputTextArea.value,
    setValue: (v) => { outputTextArea.value = v; },
    refresh: () => {}
  };
}

function loadCodeMirror() {
  return new Promise((resolve) => {
    if (typeof CodeMirror !== 'undefined') {
      resolve(true);
      return;
    }

    const styleId = 'toolnexus-codemirror-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('link');
      style.id = styleId;
      style.rel = 'stylesheet';
      style.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css';
      style.crossOrigin = 'anonymous';
      document.head.appendChild(style);
    }

    const baseScriptId = 'toolnexus-codemirror-script';
    const modeScriptId = 'toolnexus-codemirror-mode-script';

    const loadScript = (id, src, onload) => {
      const existing = document.getElementById(id);
      if (existing) {
        if (existing.dataset.loaded === 'true') {
          onload();
        } else {
          existing.addEventListener('load', onload, { once: true });
          existing.addEventListener('error', () => resolve(false), { once: true });
        }
        return;
      }

      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.addEventListener('load', () => {
        script.dataset.loaded = 'true';
        onload();
      }, { once: true });
      script.addEventListener('error', () => resolve(false), { once: true });
      document.head.appendChild(script);
    };

    loadScript(baseScriptId, 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js', () => {
      loadScript(modeScriptId, 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js', () => resolve(true));
    });
  });
}

function getInputValue() {
  return inputEditor?.getValue?.() ?? '';
}

function setInputValue(value) {
  inputEditor?.setValue?.(value ?? '');
}

function getOutputValue() {
  return outputEditor?.getValue?.() ?? '';
}

function setOutputValue(value) {
  outputEditor?.setValue?.(value ?? '');
}

function bindEvents() {
  runBtn?.addEventListener('click', run);

  copyBtn?.addEventListener('click', async () => {
    const output = getOutputValue();

    if (!output.trim()) {
      showToast('Nothing to copy.', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      showToast('Copied to clipboard.', 'success');
    } catch {
      showToast('Copy failed.', 'error');
    }
  });

  downloadBtn?.addEventListener('click', () => {
    const output = getOutputValue();

    if (!output.trim()) {
      showToast('Nothing to download.', 'warning');
      return;
    }

    const blob = new Blob([output], { type: 'text/plain' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `${slug}-output.txt`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);

    showToast('Download started.', 'info');
  });

  shareBtn?.addEventListener('click', createShareLink);
  saveCollectionBtn?.addEventListener('click', saveToCollection);
  quickRunBtn?.addEventListener('click', quickRunFromEmptyState);

  actionSelect?.addEventListener('change', () => {
    scheduleSessionPersist();
    rememberUserPreferences();
    renderSmartContextHint();
    renderIntelligenceLayer();
  });

  if (currentEditorType === 'monaco') {
    inputEditor.addCommand(monacoRuntime.KeyMod.CtrlCmd | monacoRuntime.KeyCode.Enter, run);
    inputEditor.onDidChangeModelContent(() => {
      scheduleSessionPersist();
      renderSmartContextHint();
      renderIntelligenceLayer();
      evolveEmptyState();
    });
  } else if (currentEditorType === 'codemirror') {
    inputEditor.addKeyMap({ 'Ctrl-Enter': run, 'Cmd-Enter': run });
    inputEditor.on('change', () => {
      scheduleSessionPersist();
      renderSmartContextHint();
      renderIntelligenceLayer();
      evolveEmptyState();
    });
  } else {
    inputTextArea.addEventListener('input', () => {
      scheduleSessionPersist();
      renderSmartContextHint();
      renderIntelligenceLayer();
      evolveEmptyState();
    });
    inputTextArea.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        run();
      }
    });
  }

  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      createShareLink();
      return;
    }

  });

  window.addEventListener('toolnexus:themechange', applyEditorTheme);
  workflowContinueBtn?.addEventListener('click', () => {
    const recommendation = buildRecommendations(slug)[0];
    if (!recommendation) return;
    window.location.href = `/tools/${recommendation.slug}`;
  });
}


function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/\u0000/g, '');
}

function hasInput() {
  return getInputValue().trim().length > 0;
}

function getUtf8SizeInBytes(input) {
  return new TextEncoder().encode(input).length;
}


function storeRecentJsonCandidate(output) {
  if (typeof output !== 'string' || !output.trim()) return;

  try {
    const parsed = JSON.parse(output);
    const normalized = JSON.stringify(parsed, null, 2);
    localStorage.setItem(STORAGE_KEYS.recentJson, normalized);
  } catch (_error) {
    // Not JSON; ignore for command palette quick-copy.
  }
}

function applyEditorTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  if (currentEditorType === 'monaco' && window.monaco?.editor) {
    monacoRuntime.editor.setTheme(isDark ? 'vs-dark' : 'vs');
    return;
  }

  const background = isDark ? '#0f172a' : '#eef3fa';
  const foreground = isDark ? '#edf2ff' : '#1f2937';

  if (currentEditorType === 'codemirror') {
    [inputEditor, outputEditor].forEach((editor) => {
      const wrapper = editor.getWrapperElement();
      wrapper.style.backgroundColor = background;
      wrapper.style.color = foreground;
      editor.refresh();
    });
  }
}

function setOutputState(hasOutput) {
  if (!outputField || !outputEmptyState) return;

  outputField.hidden = !hasOutput;
  outputEmptyState.classList.toggle('is-hidden', hasOutput);
  outputEmptyState.hidden = hasOutput;

  if (currentEditorType === 'monaco') {
    cancelAnimationFrame(pendingLayoutFrame);
    pendingLayoutFrame = requestAnimationFrame(() => {
      inputEditor?.layout?.();
      outputEditor?.layout?.();
    });
  } else {
    outputEditor?.refresh?.();
  }
}

function setResultStatus(state, text) {
  if (!resultStatus) return;

  resultStatus.className = `result-indicator result-indicator--${state}`;
  resultStatus.textContent = text;
}

function setConfidenceState(state) {
  if (!confidenceBadge || !runtimeStatusBand) return;

  confidenceBadge.hidden = false;
  confidenceBadge.textContent = `Confidence: ${state.charAt(0).toUpperCase()}${state.slice(1)}`;
  runtimeStatusBand.dataset.confidence = state;
}

function setRunningState(running) {
  isRunning = running;

  if (runBtn) {
    runBtn.disabled = running;
    runBtn.setAttribute('aria-busy', running ? 'true' : 'false');
  }

  if (runBtnLabel) {
    const loadingLabel = runBtnLabel.dataset.loadingLabel || 'Running…';
    const defaultLabel = runBtnLabel.dataset.defaultLabel || 'Run';
    runBtnLabel.textContent = running ? loadingLabel : defaultLabel;
  }

  if (copyBtn) copyBtn.disabled = running;
  if (downloadBtn) downloadBtn.disabled = running;

  setResultStatus(running ? 'running' : 'idle', running ? 'Running tool...' : 'Ready');
}

function showError(message) {
  if (!errorMessage) return;
  errorMessage.hidden = false;
  const intel = intelligenceEngine.inferErrorIntelligence(message);
  errorMessage.innerHTML = `<strong>${message}</strong><small>${intel.explanation} ${intel.probableCause} ${intel.quickFix}</small>`;
  lastErrorMessage = message;
  setConfidenceState('error');
}

function clearError() {
  if (!errorMessage) return;
  errorMessage.hidden = true;
  errorMessage.textContent = '';
  lastErrorMessage = '';
}

function renderContextHints(hints = []) {
  if (!contextHints) return;
  contextHints.innerHTML = '';

  hints.forEach((hint) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `tool-context-hint tool-context-hint--${hint.level || 'info'}`;
    chip.textContent = hint.text;
    chip.addEventListener('click', () => {
      dismissedHintIds.add(hint.id);
      writeStorageJson(`toolnexus.intel.dismissed.${slug}`, [...dismissedHintIds]);
      renderIntelligenceLayer();
    });
    contextHints.appendChild(chip);
  });
}

function applySuggestionCommand(suggestion) {
  if (!suggestion) return;
  if (suggestion.command === 'set-action') {
    const option = actionSelect?.querySelector(`option[value="${CSS.escape(suggestion.value)}"]`);
    if (option && actionSelect) {
      actionSelect.value = suggestion.value;
      renderIntelligenceLayer();
      showToast(`Action switched to ${suggestion.value}.`, 'info');
    }
    return;
  }

  if (suggestion.command === 'navigate' && suggestion.value) {
    window.location.href = suggestion.value;
    return;
  }

  if (suggestion.command === 'copy') {
    copyBtn?.click();
    return;
  }

  if (suggestion.command === 'download') {
    downloadBtn?.click();
  }
}

function renderSuggestionChips(suggestions = []) {
  if (!suggestionChips) return;
  suggestionChips.innerHTML = '';

  suggestions.forEach((suggestion) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tool-suggestion-chip';
    button.textContent = suggestion.label;
    button.addEventListener('click', () => applySuggestionCommand(suggestion));
    suggestionChips.appendChild(button);
  });
}

function renderIntelligenceLayer(latestOutput = '') {
  const input = getInputValue();
  const output = latestOutput || getOutputValue();
  const selectedAction = actionSelect?.value ?? 'run';
  const context = intelligenceEngine.buildContextHints({ input, selectedAction, dismissed: [...dismissedHintIds] });

  if (detectedFormatBadge) {
    detectedFormatBadge.hidden = !input.trim();
    detectedFormatBadge.textContent = context.detection.badge;
  }

  const isValidJson = context.detection.type === 'json' && !lastErrorMessage;
  setConfidenceState(intelligenceEngine.classifyConfidence({
    hasInput: Boolean(input.trim()),
    hasError: Boolean(lastErrorMessage),
    warningCount: context.hints.filter((item) => item.level === 'warning').length,
    isValidJson
  }));

  renderContextHints(context.hints);
  renderSuggestionChips(intelligenceEngine.buildActionSuggestions({
    toolSlug: slug,
    input,
    output,
    selectedAction
  }));

  applyAdaptiveToolbar({ hasInput: Boolean(input.trim()), hasOutput: Boolean(output.trim()) });
}

function initializeAdaptiveToolbar() {
  applyAdaptiveToolbar({ hasInput: hasInput(), hasOutput: Boolean(getOutputValue().trim()) });
}

function applyAdaptiveToolbar({ hasInput: hasInputValue, hasOutput }) {
  if (runBtn) runBtn.disabled = isRunning || !hasInputValue;
  if (copyBtn) copyBtn.hidden = !hasOutput;
  if (downloadBtn) downloadBtn.hidden = !hasOutput;
  if (shareBtn) shareBtn.classList.toggle('tool-btn--ghost', !hasOutput);
}

function evolveEmptyState() {
  if (!outputEmptyState || !emptyStateHint) return;
  clearTimeout(emptyStateTimer);

  const hasUserInput = hasInput();
  if (hasUserInput) {
    emptyStateTitle && (emptyStateTitle.textContent = 'Ready to execute.');
    emptyStateHint.textContent = 'Input detected. Run now to generate intelligent suggestions.';
    if (emptyStateExample) emptyStateExample.hidden = true;
    if (quickRunBtn) quickRunBtn.hidden = true;
    return;
  }

  emptyStateTitle && (emptyStateTitle.textContent = 'No output yet.');
  emptyStateHint.textContent = 'Paste data to begin.';
  if (emptyStateExample) emptyStateExample.hidden = true;
  if (quickRunBtn) quickRunBtn.hidden = true;

  emptyStateTimer = setTimeout(() => {
    if (hasInput()) return;
    emptyStateHint.textContent = 'Try the example payload for a quick first run.';
    if (emptyStateExample) emptyStateExample.hidden = false;
  }, 1000);

  setTimeout(() => {
    if (hasInput()) return;
    if (quickRunBtn) quickRunBtn.hidden = false;
  }, 2200);
}

function quickRunFromEmptyState() {
  if (hasInput()) {
    run();
    return;
  }

  const sample = document.getElementById('sampleInput')?.textContent?.trim() || '{"example": true}';
  setInputValue(sample);
  renderIntelligenceLayer();
  run();
}

function rememberUserPreferences() {
  const preference = readStorageJson(`toolnexus.intel.preferences.${slug}`, {});
  preference.lastAction = actionSelect?.value ?? preference.lastAction ?? 'run';
  const wrapToggle = document.getElementById('wrapToggle');
  if (wrapToggle instanceof HTMLInputElement) {
    preference.wrap = wrapToggle.checked;
  }
  writeStorageJson(`toolnexus.intel.preferences.${slug}`, preference);
}

function hydratePreferences() {
  const preference = readStorageJson(`toolnexus.intel.preferences.${slug}`, null);
  if (!preference) return;
  if (preference.lastAction && actionSelect?.querySelector(`option[value="${CSS.escape(preference.lastAction)}"]`)) {
    actionSelect.value = preference.lastAction;
  }
  const wrapToggle = document.getElementById('wrapToggle');
  if (wrapToggle instanceof HTMLInputElement && typeof preference.wrap === 'boolean') {
    wrapToggle.checked = preference.wrap;
  }
}

function showToast(message, type = 'info') {
  if (!toastRegion) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.role = 'status';
  toast.innerHTML = `<strong>${type.toUpperCase()}</strong><span>${message}</span>`;

  toastRegion.appendChild(toast);
  setTimeout(() => toast.classList.add('is-visible'), 5);
  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 220);
  }, 3200);
}


window.addEventListener('beforeunload', () => {
  inputEditor?.dispose?.();
  outputEditor?.dispose?.();
});

function reportToolPageRuntimeIncident({ action, reason }) {
  logger.warn('Tool page runtime incident reported.', { action, reason });
  runtimeIncidentReporter?.report?.({
    toolSlug: slug || 'unknown-tool',
    phase: 'execute',
    errorType: 'contract_drift',
    message: `Tool page execution skipped due to runtime result mismatch (${reason || 'unknown_reason'}).`,
    payloadType: 'object',
    timestamp: new Date().toISOString(),
    stack: action ? `action:${action}` : undefined
  });
}

function renderRuntimeFallbackAndStop({ action, reason }) {
  reportToolPageRuntimeIncident({ action, reason });
  renderInsight(null);
  showError(TOOL_PAGE_RUNTIME_FALLBACK_MESSAGE);
  setOutputValue(TOOL_PAGE_RUNTIME_FALLBACK_MESSAGE);
  setOutputState(true);
  setResultStatus('failure', 'Execution skipped');
  showToast('Execution skipped due to runtime mismatch.', 'warning');
}

let insightPanel = null;

function ensureInsightPanel() {
  if (insightPanel) return insightPanel;

  const outputSection = toolOutputHeading?.closest('.tool-panel');
  if (!outputSection) return null;

  const details = document.createElement('details');
  details.className = 'tool-insight';
  details.hidden = true;

  const summary = document.createElement('summary');
  summary.textContent = '⚡ Smart Insight';

  const body = document.createElement('div');
  body.className = 'tool-insight__body';
  body.innerHTML = [
    '<p class="tool-insight__title"></p>',
    '<p class="tool-insight__explanation"></p>',
    '<p class="tool-insight__suggestion"></p>',
    '<pre class="tool-insight__example" hidden></pre>'
  ].join('');

  details.appendChild(summary);
  details.appendChild(body);
  outputSection.appendChild(details);
  insightPanel = details;
  return details;
}

function renderInsight(insight) {
  const panel = ensureInsightPanel();
  if (!panel) return;

  if (!insight) {
    panel.hidden = true;
    panel.open = false;
    return;
  }

  const title = panel.querySelector('.tool-insight__title');
  const explanation = panel.querySelector('.tool-insight__explanation');
  const suggestion = panel.querySelector('.tool-insight__suggestion');
  const example = panel.querySelector('.tool-insight__example');

  if (title) title.textContent = `Title: ${insight.title ?? ''}`;
  if (explanation) explanation.textContent = `Explanation: ${insight.explanation ?? ''}`;
  if (suggestion) suggestion.textContent = `Suggestion: ${insight.suggestion ?? ''}`;

  if (example) {
    if (insight.exampleFix) {
      example.hidden = false;
      example.textContent = `ExampleFix: ${insight.exampleFix}`;
    } else {
      example.hidden = true;
      example.textContent = '';
    }
  }

  panel.hidden = false;
}


function normalizePathPrefix(pathPrefix) {
  const normalized = (pathPrefix ?? '').toString().trim();
  if (!normalized) return '/api/v1/tools';

  return `/${normalized.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

async function executeToolActionViaApi({ baseUrl = '', slug: toolSlug, action, input }) {
  const payload = normalizeToolExecutionPayload(action, input, { toolSlug });
  const normalizedSlug = typeof toolSlug === 'string' ? toolSlug.trim() : '';
  const normalizedAction = payload.isValidAction ? payload.action.trim() : '';

  if (!normalizedSlug) throw new Error('Tool configuration error: missing slug.');
  if (!normalizedAction) throw new Error('Please select an action before running the tool.');

  const origin = (baseUrl ?? '').trim().replace(/\/$/, '');
  const endpointPath = `${toolExecutionPathPrefix}/${encodeURIComponent(normalizedSlug)}/${encodeURIComponent(normalizedAction)}`;
  const endpoint = origin ? `${origin}${endpointPath}` : endpointPath;

  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: payload.input })
  });

  let result = null;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    let message = 'Tool execution failed.';

    if (response.status === 400) {
      message = result?.error || result?.detail || 'Invalid request.';
    } else if (response.status === 404) {
      message = result?.error || 'Tool not found.';
    } else if (response.status === 500) {
      message = result?.error || result?.detail || 'Server error.';
    } else {
      message = result?.error || result?.detail || `Request failed with status ${response.status}.`;
    }

    throw new Error(message);
  }

  return result || { output: 'No output', success: false, error: 'No output' };
}

async function run() {
  const selectedAction = actionSelect?.value ?? '';

  if (!slug) {
    showError('Tool configuration error.');
    return;
  }

  if (!hasInput()) {
    showError('Please provide input before running.');
    showToast('Input required.', 'warning');
    return;
  }

  clearError();

  const sanitizedInput = sanitizeInput(getInputValue());

  try {
    const startedAt = performance.now();
    setRunningState(true);
    setResultStatus('running', hasInput() && getUtf8SizeInBytes(getInputValue()) > 12000 ? 'Optimizing large input…' : 'Running tool...');

    let normalizedResult = null;
    let insight = null;

    const response = await executeToolActionViaApi({
      baseUrl: apiBase,
      slug,
      action: selectedAction,
      input: sanitizedInput
    });

    normalizedResult = normalizeToolPageExecutionResult(response);

    if (normalizedResult.shouldAbort) {
      renderRuntimeFallbackAndStop({ action: selectedAction, reason: normalizedResult.reason });
      return;
    }

    insight = response?.insight ?? null;
    showToast('Execution completed.', 'success');

    const result = normalizedResult?.output || 'No output';
    lastExecutionDurationMs = Math.round(performance.now() - startedAt);

    renderInsight(insight);
    setOutputValue(result);
    storeRecentJsonCandidate(result);
    setOutputState(true);
    setResultStatus('success', 'Output updated');
    renderResultIntelligence(sanitizedInput, result);

    addToolHistory({ slug, action: selectedAction, input: sanitizedInput, output: result });
    scheduleSessionPersist();
    renderUxLists();
    renderSmartContextHint(result);
    renderIntelligenceLayer(result);
    updateCompletionSignal(result);
  } catch (error) {
    const message = error?.message || 'Unable to run tool due to a network error.';

    console.error('Tool execution failed', { slug, action: selectedAction, error });

    renderInsight(null);
    showError(message);
    setOutputValue(message);
    setOutputState(true);
    setResultStatus('failure', 'Execution failed');
    renderResultIntelligence(sanitizedInput, message);
    renderIntelligenceLayer();
    showToast('Execution failed.', 'error');
  } finally {
    setRunningState(false);
    rememberUserPreferences();
  }
}

function renderResultIntelligence(input, output) {
  const intelligence = intelligenceEngine.buildResultIntelligence({
    input,
    output,
    durationMs: lastExecutionDurationMs,
    error: lastErrorMessage
  });
  const statusLines = [
    `Execution ${intelligence.durationText}`,
    intelligence.reductionText,
    intelligence.quality
  ];
  setResultStatus(lastErrorMessage ? 'failure' : 'success', statusLines.join(' · '));
}

function readStorageJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorageJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function writeRecentTool(toolSlug) {
  if (!toolSlug) return;
  const current = readStorageJson(STORAGE_KEYS.recentTools, []);
  const next = [toolSlug, ...current.filter((item) => item !== toolSlug)].slice(0, MAX_RECENT);
  writeStorageJson(STORAGE_KEYS.recentTools, next);
}

function addToolHistory(entry) {
  const current = readStorageJson(STORAGE_KEYS.history, []);
  const item = {
    slug: entry.slug,
    action: entry.action,
    inputSize: getUtf8SizeInBytes(entry.input),
    outputSize: getUtf8SizeInBytes(entry.output),
    preview: (entry.output || '').slice(0, 80),
    createdAt: new Date().toISOString()
  };

  const next = [item, ...current].slice(0, MAX_HISTORY);
  writeStorageJson(STORAGE_KEYS.history, next);
}

function persistSession() {
  const payload = {
    slug,
    action: actionSelect?.value ?? '',
    input: getInputValue(),
    output: getOutputValue(),
    updatedAt: new Date().toISOString()
  };
  writeStorageJson(STORAGE_KEYS.session, payload);
}

function scheduleSessionPersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => persistSession(), { timeout: 400 });
      return;
    }
    persistSession();
  }, 120);
}

function hydrateSession() {
  const session = readStorageJson(STORAGE_KEYS.session, null);
  if (!session || session.slug !== slug) return;

  if (session.action && actionSelect?.querySelector(`option[value="${CSS.escape(session.action)}"]`)) {
    actionSelect.value = session.action;
  }

  if (session.input) setInputValue(session.input);

  if (session.output) {
    setOutputValue(session.output);
    setOutputState(true);
    setResultStatus('success', 'Restored from last session');
  }

  hydratePreferences();
}

function hydrateFromUrl() {
  const params = new URLSearchParams(window.location.search);

  const urlAction = params.get('action');
  if (urlAction && actionSelect?.querySelector(`option[value="${CSS.escape(urlAction)}"]`)) {
    actionSelect.value = urlAction;
  }

  const encodedInput = params.get('input');
  if (encodedInput) {
    try {
      const decoded = decodeURIComponent(escape(window.atob(encodedInput.replace(/-/g, '+').replace(/_/g, '/'))));
      if (decoded.trim()) {
        setInputValue(decoded);
        showToast('Input prefilled from URL.', 'info');
      }
    } catch {
      // ignore malformed query payloads
    }
  }
}

async function createShareLink() {
  const input = getInputValue();
  const selectedAction = actionSelect?.value ?? '';
  const encoded = btoa(unescape(encodeURIComponent(input))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('action', selectedAction);
  nextUrl.searchParams.set('input', encoded);

  try {
    await navigator.clipboard.writeText(nextUrl.toString());
    showToast('Shareable link copied.', 'success');
  } catch {
    showToast('Unable to copy link.', 'error');
  }
}

function saveToCollection() {
  const rawName = collectionNameInput?.value?.trim();
  if (!rawName) {
    showToast('Enter a collection name first.', 'warning');
    return;
  }

  const collections = readStorageJson(STORAGE_KEYS.collections, {});
  const current = Array.isArray(collections[rawName]) ? collections[rawName] : [];

  collections[rawName] = [slug, ...current.filter((item) => item !== slug)].slice(0, MAX_RECENT);
  writeStorageJson(STORAGE_KEYS.collections, collections);
  collectionNameInput.value = '';

  renderUxLists();
  showToast(`Saved to ${rawName}.`, 'success');
}

function renderUxLists() {
  renderPinnedRecent();
  renderHistory();
  renderCollections();
}

function deriveToolType(toolSlug) {
  const normalized = (toolSlug || '').toLowerCase();
  if (normalized.includes('json') || normalized.includes('yaml') || normalized.includes('xml')) return 'json';
  if (normalized.includes('csv') || normalized.includes('file')) return 'csv';
  if (normalized.includes('format') || normalized.includes('minifier')) return 'format';
  if (normalized.includes('encode')) return 'encode';
  if (normalized.includes('decode')) return 'decode';
  return 'text';
}

function buildRecommendations(toolSlug) {
  const type = deriveToolType(toolSlug);
  const toolSlugs = TOOL_INTELLIGENCE_GRAPH[type] || TOOL_INTELLIGENCE_GRAPH.text;
  return toolSlugs
    .filter((item) => item !== toolSlug)
    .slice(0, 3)
    .map((item) => ({ slug: item, reason: `Common next step for ${type} workflows.` }));
}

function renderWorkflowIntelligence() {
  const recommendations = buildRecommendations(slug);

  if (workflowRelatedTools) {
    workflowRelatedTools.innerHTML = '';
    const fragment = document.createDocumentFragment();
    recommendations.forEach((item) => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="/tools/${item.slug}">${item.slug}</a><small>${item.reason}</small>`;
      fragment.appendChild(li);
    });
    workflowRelatedTools.appendChild(fragment);
  }

  if (workflowPathways) {
    workflowPathways.innerHTML = recommendations
      .map((item, index) => `<a class="workflow-pathway-card" href="/tools/${item.slug}"><strong>Step ${index + 2}</strong><span>${item.slug}</span></a>`)
      .join('');
  }

  renderSmartContextHint();
}

function renderSmartContextHint(latestOutput = '') {
  if (!smartContextHint) return;
  const inputLength = getInputValue().trim().length;
  const selectedAction = actionSelect?.value ?? 'run';

  if (!inputLength) {
    smartContextHint.textContent = 'INPUT → RUN → COPY. Start with sample input, then execute once.';
    return;
  }

  if (inputLength > 6000) {
    smartContextHint.textContent = 'Large payload detected. Run focused action, then chain validator/formatter.';
  } else if (latestOutput && latestOutput.trim().startsWith('{')) {
    smartContextHint.textContent = `JSON output ready from ${selectedAction}. Next chain: validate → convert.`;
  } else {
    smartContextHint.textContent = `Action ${selectedAction} active. Complete run, then open next tool.`;
  }
}

function updateCompletionSignal(result) {
  if (!workflowCompletionSignal) return;
  workflowCompletionSignal.className = 'result-indicator result-indicator--success';
  workflowCompletionSignal.textContent = 'Completed. Next step ready.';
  if (workflowContinueBtn) workflowContinueBtn.hidden = !result;
}

function renderPinnedRecent() {
  if (!uxPinnedRecent) return;

  const recents = readStorageJson(STORAGE_KEYS.recentTools, []);
  const pinned = readStorageJson(STORAGE_KEYS.pinnedTools, []);
  const items = [...new Set([...pinned, ...recents])];

  uxPinnedRecent.innerHTML = '';

  if (!items.length) {
    uxPinnedRecent.innerHTML = '<li class="ux-list__empty">Pinned and recent tools appear here.</li>';
    return;
  }

  items.forEach((toolSlug) => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="/tools/${toolSlug}">${toolSlug}</a><span>${pinned.includes(toolSlug) ? 'Pinned' : 'Recent'}</span>`;
    uxPinnedRecent.appendChild(li);
  });
}

function renderHistory() {
  if (!uxHistory) return;

  const history = readStorageJson(STORAGE_KEYS.history, []).filter((item) => item.slug === slug).slice(0, 6);
  uxHistory.innerHTML = '';

  if (!history.length) {
    uxHistory.innerHTML = '<li class="ux-list__empty">Run history appears after execution.</li>';
    return;
  }

  history.forEach((item) => {
    const li = document.createElement('li');
    const date = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    li.innerHTML = `<span>${item.action} · ${date}</span><small>${item.inputSize}B → ${item.outputSize}B</small>`;
    uxHistory.appendChild(li);
  });
}

function renderCollections() {
  if (!uxCollections) return;

  const collections = readStorageJson(STORAGE_KEYS.collections, {});
  const names = Object.keys(collections).sort((a, b) => a.localeCompare(b));
  uxCollections.innerHTML = '';

  if (!names.length) {
    uxCollections.innerHTML = '<li class="ux-list__empty">Save tools into named collections.</li>';
    return;
  }

  names.forEach((name) => {
    const li = document.createElement('li');
    const values = Array.isArray(collections[name]) ? collections[name] : [];
    const containsCurrent = values.includes(slug);

    li.innerHTML = `<span>${name}</span><small>${values.length} tools</small>`;

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'tool-btn';
    action.textContent = containsCurrent ? 'Remove this tool' : 'Add this tool';
    action.addEventListener('click', () => {
      const next = containsCurrent ? values.filter((item) => item !== slug) : [slug, ...values.filter((item) => item !== slug)];
      collections[name] = next.slice(0, MAX_RECENT);
      writeStorageJson(STORAGE_KEYS.collections, collections);
      renderCollections();
      showToast(containsCurrent ? `Removed from ${name}.` : `Added to ${name}.`, 'info');
    });

    li.appendChild(action);
    uxCollections.appendChild(li);
  });
}
});
