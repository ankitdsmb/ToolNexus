const page = document.querySelector('.tool-page');

if (!page) {
  throw new Error('Tool page not found');
}

const slug = page.dataset.slug;
const apiBase = page.dataset.apiBase;

const inputTextArea = document.getElementById('inputEditor');
const outputTextArea = document.getElementById('outputEditor');
const actionSelect = document.getElementById('actionSelect');
const runBtn = document.getElementById('runBtn');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const runSpinner = document.getElementById('runSpinner');
const errorMessage = document.getElementById('errorMessage');
const outputEmptyState = document.getElementById('outputEmptyState');
const outputField = document.getElementById('outputField');
const resultStatus = document.getElementById('resultStatus');
const toastRegion = document.getElementById('toastRegion');

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

let isRunning = false;
let lastRunSucceeded = null;

function hasInput() {
  return inputEditor.getValue().trim().length > 0;
}

function updateRunButtonState() {
  const canRun = hasInput() && !isRunning;
  runBtn.disabled = !canRun;
  runBtn.setAttribute('aria-disabled', String(!canRun));
}

function showToast(message, type = 'info') {
  if (!toastRegion) {
    return;
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.role = 'status';
  toast.textContent = message;
  toastRegion.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3000);
}

function setResultState(state, message) {
  resultStatus.className = `result-indicator result-indicator--${state}`;
  resultStatus.textContent = message;
}

function clearError() {
  errorMessage.hidden = true;
  errorMessage.textContent = '';
}

function showError(message) {
  errorMessage.hidden = false;
  errorMessage.textContent = message;
}

function showOutput(value) {
  outputEmptyState.hidden = true;
  outputField.hidden = false;
  outputEditor.setValue(value);
}

function setRunningState(running) {
  isRunning = running;
  runBtn.setAttribute('aria-busy', String(running));
  runSpinner.hidden = !running;
  updateRunButtonState();

  if (running) {
    setResultState('running', 'Running tool...');
  }
}

async function run() {
  const selectedAction = actionSelect?.value ?? '';

  if (!slug || !apiBase) {
    showError('Tool configuration error.');
    setResultState('failure', 'Execution failed');
    return;
  }

  if (!hasInput()) {
    showError('Please provide input before running the tool.');
    showToast('Input is required to run.', 'warning');
    return;
  }

  clearError();

  try {
    setRunningState(true);

    const response = await fetch(`${apiBase}/api/v1/tools/${encodeURIComponent(slug)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: selectedAction,
        input: inputEditor.getValue()
      })
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
        message = result?.error || result?.detail || 'Invalid request. Please verify the selected action and input.';
      } else if (response.status === 404) {
        message = result?.error || 'Tool not found.';
      } else if (response.status === 500) {
        message = result?.error || result?.detail || 'Server error while running the tool.';
      } else {
        message = result?.error || result?.detail || `Request failed with status ${response.status}.`;
      }

      console.error('Tool execution failed', {
        status: response.status,
        slug,
        action: selectedAction,
        body: result
      });

      showError(message);
      showOutput(message);
      setResultState('failure', 'Execution failed');
      lastRunSucceeded = false;
      showToast('Tool run failed.', 'error');
      return;
    }

    const output = result?.output || result?.error || 'No output';
    showOutput(output);
    setResultState('success', 'Execution succeeded');
    lastRunSucceeded = true;
    showToast('Tool run completed.', 'success');
  } catch (error) {
    console.error('Tool execution request crashed', {
      slug,
      action: selectedAction,
      error
    });

    const message = 'Unable to run tool due to a network or client error.';
    showError(message);
    showOutput(message);
    setResultState('failure', 'Execution failed');
    lastRunSucceeded = false;
    showToast('Tool run failed.', 'error');
  } finally {
    setRunningState(false);
  }
}

runBtn?.addEventListener('click', run);

copyBtn?.addEventListener('click', async () => {
  const output = outputEditor.getValue();

  if (!output.trim()) {
    showToast('Nothing to copy yet.', 'warning');
    return;
  }

  try {
    await navigator.clipboard.writeText(output);
    showToast('Output copied to clipboard.', 'success');
  } catch {
    showToast('Copy failed. Please copy manually.', 'error');
  }
});

downloadBtn?.addEventListener('click', () => {
  const output = outputEditor.getValue();

  if (!output.trim()) {
    showToast('Nothing to download yet.', 'warning');
    return;
  }

  const blob = new Blob([output], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${slug}-output.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Output file downloaded.', 'info');
});

inputEditor.on('change', () => {
  updateRunButtonState();

  if (lastRunSucceeded === null) {
    outputEmptyState.hidden = false;
    outputField.hidden = true;
  }
});

inputEditor.addKeyMap({
  'Ctrl-Enter': run,
  'Cmd-Enter': run
});

setRunningState(false);
setResultState('idle', 'Waiting for execution');
window.ToolNexusRun = run;
