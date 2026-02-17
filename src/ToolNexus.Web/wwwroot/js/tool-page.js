const page = document.querySelector('.tool-page');

if (!page) {
  throw new Error('Tool page not found');
}

const slug = page.dataset.slug ?? '';
const apiBase = window.ToolNexusConfig?.apiBaseUrl ?? '';
const maxClientInputBytes = 1024 * 1024;

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

/* ===============================
   Utility Functions
================================ */

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/\u0000/g, '');
}

function hasInput() {
  return inputEditor.getValue().trim().length > 0;
}

function getUtf8SizeInBytes(input) {
  return new TextEncoder().encode(input).length;
}

function isEligibleForClientExecution(input) {
  return getUtf8SizeInBytes(input) <= maxClientInputBytes;
}

/* ===============================
   UI / UX Functions
================================ */

function applyEditorTheme() {
  const isDark =
    document.documentElement.getAttribute('data-theme') === 'dark';

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
    const loadingLabel =
      runBtnLabel.dataset.loadingLabel || 'Running…';
    const defaultLabel =
      runBtnLabel.dataset.defaultLabel || 'Run';

    runBtnLabel.textContent = running
      ? loadingLabel
      : defaultLabel;
  }

  if (copyBtn) copyBtn.disabled = running;
  if (downloadBtn) downloadBtn.disabled = running;

  setResultStatus(
    running ? 'running' : 'idle',
    running ? 'Running tool...' : 'Ready'
  );
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

/* ===============================
   Client Tool Executor
================================ */

class ClientToolExecutor {
  canExecute(toolSlug, action, input) {
    const normalizedAction = action.toLowerCase();

    if (!clientSafeActions.has(normalizedAction)) {
      return false;
    }

    if (!isEligibleForClientExecution(input)) {
      return false;
    }

    const module = window.ToolNexusModules?.[toolSlug];
    if (module?.runTool) {
      return true;
    }

    if (
      toolSlug === 'json-formatter' &&
      (normalizedAction === 'format' ||
        normalizedAction === 'minify')
    ) {
      return true;
    }

    if (
      toolSlug === 'base64-tool' &&
      (normalizedAction === 'encode' ||
        normalizedAction === 'decode')
    ) {
      return true;
    }

    return false;
  }

  async execute(toolSlug, action, input) {
    const module = window.ToolNexusModules?.[toolSlug];

    if (module?.runTool) {
      return module.runTool(action, input);
    }

    if (toolSlug === 'json-formatter') {
      return this.executeJsonFormatter(action, input);
    }

    if (toolSlug === 'base64-tool') {
      return this.executeBase64(action, input);
    }

    throw new Error(
      'Client execution is not supported for this tool/action.'
    );
  }

  executeJsonFormatter(action, input) {
    let parsed;
    try {
      parsed = JSON.parse(input);
    } catch {
      throw new Error(
        'Invalid JSON input. Please fix JSON syntax and try again.'
      );
    }

    if (action === 'format') {
      return JSON.stringify(parsed, null, 2);
    }

    if (action === 'minify') {
      return JSON.stringify(parsed);
    }

    throw new Error('Unsupported JSON action.');
  }

  executeBase64(action, input) {
    if (action === 'encode') {
      return this.base64EncodeUtf8(input);
    }

    if (action === 'decode') {
      return this.base64DecodeUtf8(input);
    }

    throw new Error('Unsupported Base64 action.');
  }

  base64EncodeUtf8(input) {
    try {
      const bytes = new TextEncoder().encode(input);
      let binary = '';

      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }

      return btoa(binary);
    } catch {
      throw new Error(
        'Unable to Base64 encode input in the browser.'
      );
    }
  }

  base64DecodeUtf8(input) {
    try {
      const binary = atob(input);
      const bytes = new Uint8Array(binary.length);

      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      return new TextDecoder().decode(bytes);
    } catch {
      throw new Error(
        'Invalid Base64 input. Please verify the encoded data.'
      );
    }
  }
}

const clientExecutor = new ClientToolExecutor();

/* ===============================
   API Execution
================================ */

/**
 * Executes a tool action against the ASP.NET Core API route:
 * POST /api/v1/tools/{slug}/{action}
 *
 * NOTE:
 * - Both slug and action are required route segments.
 * - baseUrl is optional so this function can work in local, staging, and production.
 */
async function executeToolActionViaApi({
  baseUrl = '',
  slug: toolSlug,
  action,
  input
}) {
  const normalizedSlug = (toolSlug ?? '').trim();
  const normalizedAction = (action ?? '').trim();

  if (!normalizedSlug) {
    throw new Error('Tool configuration error: missing slug.');
  }

  if (!normalizedAction) {
    throw new Error('Please select an action before running the tool.');
  }

  const origin = (baseUrl ?? '').trim().replace(/\/$/, '');
  const endpoint = origin
    ? `${origin}/api/v1/tools/${encodeURIComponent(normalizedSlug)}/${encodeURIComponent(normalizedAction)}`
    : `/api/v1/tools/${encodeURIComponent(normalizedSlug)}/${encodeURIComponent(normalizedAction)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
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
      message =
        result?.error ||
        result?.detail ||
        'Invalid request.';
    } else if (response.status === 404) {
      message = result?.error || 'Tool not found.';
    } else if (response.status === 500) {
      message =
        result?.error ||
        result?.detail ||
        'Server error.';
    } else {
      message =
        result?.error ||
        result?.detail ||
        `Request failed with status ${response.status}.`;
    }

    throw new Error(message);
  }

  return result?.output || result?.error || 'No output';
}

// Sample usage (kept as executable documentation):
// executeToolActionViaApi({
//   baseUrl: window.ToolNexusConfig?.apiBaseUrl,
//   slug: 'xml-formatter',
//   action: 'format',
//   input: '<root><item>example</item></root>'
// });

/* ===============================
   Run Execution
================================ */

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

  const sanitizedInput = sanitizeInput(
    inputEditor.getValue()
  );

  try {
    setRunningState(true);

    let result = '';

    if (
      clientExecutor.canExecute(
        slug,
        selectedAction,
        sanitizedInput
      )
    ) {
      try {
        result = await clientExecutor.execute(
          slug,
          selectedAction,
          sanitizedInput
        );
        showToast('Executed locally.', 'success');
      } catch (clientError) {
        const safeMessage =
          clientError?.message ||
          'Client execution failed. Falling back to server.';
        showError(safeMessage);
        showToast(
          'Client execution failed; using server fallback.',
          'warning'
        );
      }
    }

    if (!result) {
      result = await executeToolActionViaApi({
        baseUrl: apiBase,
        slug,
        action: selectedAction,
        input: sanitizedInput
      });
      showToast('Execution completed.', 'success');
    }

    outputEditor.setValue(result);
    setOutputState(true);
    setResultStatus('success', 'Output updated');
  } catch (error) {
    const message =
      error?.message ||
      'Unable to run tool due to a network error.';

    // Minimal non-OK/network diagnostics example to aid browser debugging.
    console.error('Tool execution failed', {
      slug,
      action: selectedAction,
      error
    });

    showError(message);
    outputEditor.setValue(message);
    setOutputState(true);
    setResultStatus('failure', 'Execution failed');
    showToast('Execution failed.', 'error');
  } finally {
    setRunningState(false);
  }
}

/* ===============================
   Event Bindings
================================ */

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

  const blob = new Blob([output], {
    type: 'text/plain'
  });

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

window.addEventListener(
  'toolnexus:themechange',
  applyEditorTheme
);

setOutputState(false);
setRunningState(false);
applyEditorTheme();

window.ToolNexusRun = run;
