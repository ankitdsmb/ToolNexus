const page = document.querySelector('.tool-page');

if (!page) {
  throw new Error('Tool page not found');
}

const slug = page.dataset.slug ?? '';
const apiBase = page.dataset.apiBase ?? '';

const clientSafeActions = new Set(
  (page.dataset.clientSafeActions ?? '')
    .split(',')
    .map(a => a.trim().toLowerCase())
    .filter(Boolean)
);

const inputTextArea = document.getElementById('inputEditor');
const outputTextArea = document.getElementById('outputEditor');
const actionSelect = document.getElementById('actionSelect');

const runBtn = document.getElementById('runBtn');
const runBtnLabel = runBtn?.querySelector('.tool-btn__label');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');

const errorMessage = document.getElementById('errorMessage');
const resultStatus = document.getElementById('resultStatus');
const outputField = document.getElementById('outputField');
const outputEmptyState = document.getElementById('outputEmptyState');
const toastRegion = document.getElementById('toastRegion');

const inputEditor = CodeMirror.fromTextArea(inputTextArea, {
  lineNumbers: true,
  mode: 'application/json',
  theme: 'default'
});

const outputEditor = CodeMirror.fromTextArea(outputTextArea, {
  lineNumbers: true,
  mode: 'application/json',
  readOnly: true,
  theme: 'default'
});

let isRunning = false;

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/\u0000/g, '');
}

function hasInput() {
  return inputEditor.getValue().trim().length > 0;
}

function applyEditorTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const background = isDark ? '#0f172a' : '#eef3fa';
  const foreground = isDark ? '#edf2ff' : '#1f2937';

  [inputEditor, outputEditor].forEach((editor) => {
    const wrapper = editor.getWrapperElement();
    wrapper.style.backgroundColor = background;
    wrapper.style.color = foreground;
    editor.refresh();
  });
}

function setOutputState(hasOutput) {
  if (!outputField || !outputEmptyState) return;

  outputField.hidden = !hasOutput;
  outputEmptyState.classList.toggle('is-hidden', hasOutput);
  outputEmptyState.hidden = hasOutput;
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
  toast.textContent = message;

  toastRegion.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

class ClientToolExecutor {
  canExecute(toolSlug, action) {
    const module = window.ToolNexusModules?.[toolSlug];
    return Boolean(module?.runTool) && clientSafeActions.has(action.toLowerCase());
  }

  async execute(toolSlug, action, input) {
    const module = window.ToolNexusModules?.[toolSlug];

    if (!module?.runTool) {
      throw new Error('Client module unavailable.');
    }

    return module.runTool(action, input);
  }
}

const clientExecutor = new ClientToolExecutor();

async function executeViaApi(action, input) {
  const response = await fetch(`${apiBase}/api/v1/tools/${encodeURIComponent(slug)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, input })
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

  return result?.output || result?.error || 'No output';
}

async function run() {
  const selectedAction = actionSelect?.value ?? '';

  if (!slug || !apiBase) {
    showError('Tool configuration error.');
    return;
  }

  if (!hasInput()) {
    showError('Please provide input before running.');
    showToast('Input required.', 'warning');
    return;
  }

  clearError();

  const sanitizedInput = sanitizeInput(inputEditor.getValue());

  try {
    setRunningState(true);

    let result = '';

    if (clientExecutor.canExecute(slug, selectedAction)) {
      try {
        result = await clientExecutor.execute(slug, selectedAction, sanitizedInput);
        showToast('Executed locally.', 'success');
      } catch (clientError) {
        console.warn('Client execution failed, falling back to API.', clientError);
      }
    }

    if (!result) {
      result = await executeViaApi(selectedAction, sanitizedInput);
      showToast('Execution completed.', 'success');
    }

    outputEditor.setValue(result);
    setOutputState(true);
    setResultStatus('success', 'Output updated');
  } catch (error) {
    const message = error?.message || 'Unable to run tool due to a network error.';
    showError(message);
    outputEditor.setValue(message);
    setOutputState(true);
    setResultStatus('failure', 'Execution failed');
    showToast('Execution failed.', 'error');
  } finally {
    setRunningState(false);
  }
}

runBtn?.addEventListener('click', run);

copyBtn?.addEventListener('click', async () => {
  const output = outputEditor.getValue();

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
  const output = outputEditor.getValue();

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

inputEditor.addKeyMap({
  'Ctrl-Enter': run,
  'Cmd-Enter': run
});

window.addEventListener('toolnexus:themechange', applyEditorTheme);

setOutputState(false);
setRunningState(false);
applyEditorTheme();

window.ToolNexusRun = run;
