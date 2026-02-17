const page = document.querySelector('.tool-page');

if (!page) {
  throw new Error('Tool page not found');
}

/* --------------------------------------------------
   Configuration
-------------------------------------------------- */

const slug = page.dataset.slug ?? '';
const apiBase = page.dataset.apiBase ?? '';

const clientSafeActions = new Set(
  (page.dataset.clientSafeActions ?? '')
    .split(',')
    .map(a => a.trim().toLowerCase())
    .filter(Boolean)
);

/* --------------------------------------------------
   DOM References
-------------------------------------------------- */

const inputTextArea = document.getElementById('inputEditor');
const outputTextArea = document.getElementById('outputEditor');
const actionSelect = document.getElementById('actionSelect');

const runBtn = document.getElementById('runBtn');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const runSpinner = document.getElementById('runSpinner');

const errorMessage = document.getElementById('errorMessage');
const resultStatus = document.getElementById('resultStatus');
const toastRegion = document.getElementById('toastRegion');

/* --------------------------------------------------
   CodeMirror Setup
-------------------------------------------------- */

const inputEditor = CodeMirror.fromTextArea(inputTextArea, {
  lineNumbers: true,
  mode: 'application/json',
  theme: 'default'
});

const outputEditor = CodeMirror.fromTextArea(outputTextArea, {
  lineNumbers: true,
  mode: 'application/json',
  readOnly: true
});

/* --------------------------------------------------
   State
-------------------------------------------------- */

let isRunning = false;

/* --------------------------------------------------
   Utilities
-------------------------------------------------- */

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/\u0000/g, '');
}

function hasInput() {
  return inputEditor.getValue().trim().length > 0;
}

function setRunningState(running) {
  isRunning = running;

  if (runBtn) {
    runBtn.disabled = running;
    runBtn.setAttribute('aria-busy', running ? 'true' : 'false');
  }

  if (runSpinner) {
    runSpinner.hidden = !running;
  }

  if (resultStatus) {
    resultStatus.className = `result-indicator result-indicator--${running ? 'running' : 'idle'}`;
    resultStatus.textContent = running ? 'Running tool...' : 'Ready';
  }
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

/* --------------------------------------------------
   Client Executor (Hybrid Architecture)
-------------------------------------------------- */

class ClientToolExecutor {
  canExecute(toolSlug, action) {
    const module = window.ToolNexusModules?.[toolSlug];
    return Boolean(module?.runTool) &&
      clientSafeActions.has(action.toLowerCase());
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

/* --------------------------------------------------
   API Execution
-------------------------------------------------- */

async function executeViaApi(action, input) {
  const response = await fetch(
    `${apiBase}/api/v1/tools/${encodeURIComponent(slug)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, input })
    }
  );

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
      message = result?.error || result?.detail ||
        `Request failed with status ${response.status}.`;
    }

    throw new Error(message);
  }

  return result?.output || result?.error || 'No output';
}

/* --------------------------------------------------
   Run Logic
-------------------------------------------------- */

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

    // Try client-side execution first
    if (clientExecutor.canExecute(slug, selectedAction)) {
      try {
        const localOutput = await clientExecutor.execute(
          slug,
          selectedAction,
          sanitizedInput
        );

        outputEditor.setValue(localOutput ?? 'No output');
        showToast('Executed locally.', 'success');
        return;
      } catch (clientError) {
        console.warn('Client execution failed, falling back to API.', clientError);
      }
    }

    // Fallback to API
    const apiOutput = await executeViaApi(selectedAction, sanitizedInput);
    outputEditor.setValue(apiOutput);
    showToast('Execution completed.', 'success');

  } catch (error) {
    console.error('Execution error:', error);
    outputEditor.setValue(
      error?.message ||
      'Unable to run tool due to a network error.'
    );
    showToast('Execution failed.', 'error');
  } finally {
    setRunningState(false);
  }
}

/* --------------------------------------------------
   Event Listeners
-------------------------------------------------- */

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

/* --------------------------------------------------
   Initial State
-------------------------------------------------- */

setRunningState(false);

window.ToolNexusRun = run;
