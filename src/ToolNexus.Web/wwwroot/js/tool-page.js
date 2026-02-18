document.addEventListener('DOMContentLoaded', () => {
const page = document.querySelector('.tool-page');

if (!page) {
  console.debug('tool-page.js: not on tool page, skipping initialization.');
  return;
}

const slug = page.dataset.slug ?? '';
const apiBase = window.ToolNexusConfig?.apiBaseUrl ?? '';
const toolExecutionPathPrefix = normalizePathPrefix(window.ToolNexusConfig?.toolExecutionPathPrefix ?? '/api/v1/tools');
const maxClientInputBytes = 1024 * 1024;

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

const clientSafeActions = new Set(
  (page.dataset.clientSafeActions ?? '')
    .split(',')
    .map(a => a.trim().toLowerCase())
    .filter(Boolean)
);

const inputTextArea = document.getElementById('inputEditor');
const outputTextArea = document.getElementById('outputEditor');
const actionSelect = document.getElementById('actionSelect');
const inputEditorSurface = document.getElementById('inputEditorSurface');
const outputEditorSurface = document.getElementById('outputEditorSurface');

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

const errorMessage = document.getElementById('errorMessage');
const resultStatus = document.getElementById('resultStatus');
const outputField = document.getElementById('outputField');
const outputEmptyState = document.getElementById('outputEmptyState');
const toolOutputHeading = document.getElementById('toolOutputHeading');
const toastRegion = document.getElementById('toastRegion');

let isRunning = false;
let inputEditor = null;
let outputEditor = null;
let currentEditorType = 'textarea';

init().catch((error) => {
  console.error('Tool page initialization failed', error);
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

  window.ToolNexusRun = run;
}

async function loadToolModule() {
  if (!slug) return;

  try {
    await import(`./tools/${slug}.js`);
  } catch (error) {
    // Not every server-backed tool has a dedicated client enhancer module.
    console.debug(`No dedicated tool module loaded for "${slug}".`, error);
  }
}

async function initializeEditors() {
  const monacoReady = await loadMonaco();

  if (monacoReady) {
    currentEditorType = 'monaco';
    inputTextArea.hidden = true;
    outputTextArea.hidden = true;

    inputEditor = monaco.editor.create(inputEditorSurface, {
      value: inputTextArea.value || '',
      language: 'json',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      scrollBeyondLastLine: false,
      roundedSelection: false
    });

    outputEditor = monaco.editor.create(outputEditorSurface, {
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

function loadMonaco() {
  return new Promise((resolve) => {
    if (window.monaco?.editor) {
      resolve(true);
      return;
    }

    if (window.require) {
      window.require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs' } });
      window.require(['vs/editor/editor.main'], () => resolve(true), () => resolve(false));
      return;
    }

    const loader = document.createElement('script');
    loader.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs/loader.min.js';
    loader.onload = () => {
      if (!window.require) {
        resolve(false);
        return;
      }
      window.require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs' } });
      window.require(['vs/editor/editor.main'], () => resolve(true), () => resolve(false));
    };
    loader.onerror = () => resolve(false);
    document.head.appendChild(loader);
  });
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

  actionSelect?.addEventListener('change', () => persistSession());

  if (currentEditorType === 'monaco') {
    inputEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, run);
    inputEditor.onDidChangeModelContent(() => persistSession());
  } else if (currentEditorType === 'codemirror') {
    inputEditor.addKeyMap({ 'Ctrl-Enter': run, 'Cmd-Enter': run });
    inputEditor.on('change', persistSession);
  } else {
    inputTextArea.addEventListener('input', persistSession);
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

function isEligibleForClientExecution(input) {
  return getUtf8SizeInBytes(input) <= maxClientInputBytes;
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
    monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs');
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
    setTimeout(() => {
      inputEditor?.layout?.();
      outputEditor?.layout?.();
    }, 0);
  } else {
    outputEditor?.refresh?.();
  }
}

function setResultStatus(state, text) {
  if (!resultStatus) return;

  resultStatus.className = `result-indicator result-indicator--${state}`;
  resultStatus.textContent = text;
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
  errorMessage.textContent = message;
}

function clearError() {
  if (!errorMessage) return;
  errorMessage.hidden = true;
  errorMessage.textContent = '';
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

class ClientToolExecutor {
  canExecute(toolSlug, action, input) {
    const normalizedSlug = (toolSlug ?? '').trim();
    const normalizedAction = (action ?? '').trim().toLowerCase();

    if (!normalizedSlug || !normalizedAction) return false;
    if (!clientSafeActions.has(normalizedAction)) return false;
    if (!isEligibleForClientExecution(input)) return false;

    const module = window.ToolNexusModules?.[normalizedSlug];
    return typeof module?.runTool === 'function';
  }

  async execute(toolSlug, action, input) {
    const normalizedSlug = (toolSlug ?? '').trim();
    const module = window.ToolNexusModules?.[normalizedSlug];

    if (typeof module?.runTool !== 'function') {
      throw new Error('Client execution is not supported for this tool/action.');
    }

    return module.runTool(action, input);
  }
}

const clientExecutor = new ClientToolExecutor();

function normalizePathPrefix(pathPrefix) {
  const normalized = (pathPrefix ?? '').toString().trim();
  if (!normalized) return '/api/v1/tools';

  return `/${normalized.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

async function executeToolActionViaApi({ baseUrl = '', slug: toolSlug, action, input }) {
  const normalizedSlug = (toolSlug ?? '').trim();
  const normalizedAction = (action ?? '').trim();

  if (!normalizedSlug) throw new Error('Tool configuration error: missing slug.');
  if (!normalizedAction) throw new Error('Please select an action before running the tool.');

  const origin = (baseUrl ?? '').trim().replace(/\/$/, '');
  const endpointPath = `${toolExecutionPathPrefix}/${encodeURIComponent(normalizedSlug)}/${encodeURIComponent(normalizedAction)}`;
  const endpoint = origin ? `${origin}${endpointPath}` : endpointPath;

  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input })
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
    setRunningState(true);

    let result = '';
    let insight = null;

    if (clientExecutor.canExecute(slug, selectedAction, sanitizedInput)) {
      try {
        result = await clientExecutor.execute(slug, selectedAction, sanitizedInput);
        showToast('Executed locally.', 'success');
      } catch (clientError) {
        const safeMessage = clientError?.message || 'Client execution failed. Falling back to server.';
        showError(safeMessage);
        showToast('Client execution failed; using server fallback.', 'warning');
      }
    }

    if (!result) {
      const response = await executeToolActionViaApi({
        baseUrl: apiBase,
        slug,
        action: selectedAction,
        input: sanitizedInput
      });
      result = response?.output || response?.error || 'No output';
      insight = response?.insight ?? null;
      showToast('Execution completed.', 'success');
    }

    renderInsight(insight);
    setOutputValue(result);
    storeRecentJsonCandidate(result);
    setOutputState(true);
    setResultStatus('success', 'Output updated');

    addToolHistory({ slug, action: selectedAction, input: sanitizedInput, output: result });
    persistSession();
    renderUxLists();
  } catch (error) {
    const message = error?.message || 'Unable to run tool due to a network error.';

    console.error('Tool execution failed', { slug, action: selectedAction, error });

    renderInsight(null);
    showError(message);
    setOutputValue(message);
    setOutputState(true);
    setResultStatus('failure', 'Execution failed');
    showToast('Execution failed.', 'error');
  } finally {
    setRunningState(false);
  }
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
