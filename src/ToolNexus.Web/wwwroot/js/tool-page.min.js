const page = document.querySelector('.tool-page');

if (!page) {
  throw new Error('Tool page not found');
}

const slug = page.dataset.slug ?? '';
const apiBase = page.dataset.apiBase ?? '';
const clientSafeActions = new Set(
  (page.dataset.clientSafeActions ?? '')
    .split(',')
    .map(action => action.trim().toLowerCase())
    .filter(Boolean)
);

const inputTextArea = document.getElementById('inputEditor');
const outputTextArea = document.getElementById('outputEditor');
const actionSelect = document.getElementById('actionSelect');
const runButton = document.getElementById('runBtn');
const spinner = document.getElementById('runSpinner');

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

class IClientToolExecutor {
  canExecute(_toolSlug, _action) {
    throw new Error('Not implemented');
  }

  async execute(_toolSlug, _action, _input) {
    throw new Error('Not implemented');
  }
}

class ToolModuleClientExecutor extends IClientToolExecutor {
  canExecute(toolSlug, action) {
    const module = window.ToolNexusModules?.[toolSlug];
    return Boolean(module?.runTool) && clientSafeActions.has(action.toLowerCase());
  }

  async execute(toolSlug, action, input) {
    const module = window.ToolNexusModules?.[toolSlug];
    if (!module?.runTool) {
      throw new Error('Client tool module is unavailable.');
    }

    return module.runTool(action, input);
  }
}

const clientExecutor = new ToolModuleClientExecutor();

function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }

  return input.replace(/\u0000/g, '');
}

function setRunningState(isRunning) {
  if (runButton) {
    runButton.disabled = isRunning;
    runButton.setAttribute('aria-busy', isRunning ? 'true' : 'false');
  }

  if (spinner) {
    spinner.hidden = !isRunning;
  }
}

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
      message =
        result?.error ||
        result?.detail ||
        'Invalid request. Please verify the selected action and input.';
    } else if (response.status === 404) {
      message = result?.error || 'Tool not found.';
    } else if (response.status === 500) {
      message =
        result?.error ||
        result?.detail ||
        'Server error while running the tool.';
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

async function run() {
  const selectedAction = actionSelect?.value ?? '';

  if (!slug || !apiBase) {
    outputEditor.setValue('Tool configuration error.');
    return;
  }

  const sanitizedInput = sanitizeInput(inputEditor.getValue());

  try {
    setRunningState(true);

    if (clientExecutor.canExecute(slug, selectedAction)) {
      try {
        const localOutput = await clientExecutor.execute(slug, selectedAction, sanitizedInput);
        outputEditor.setValue(localOutput ?? 'No output');
        return;
      } catch (localError) {
        console.warn('Client execution failed; falling back to API.', {
          slug,
          action: selectedAction,
          error: localError
        });
      }
    }

    const apiOutput = await executeViaApi(selectedAction, sanitizedInput);
    outputEditor.setValue(apiOutput);
  } catch (error) {
    console.error('Tool execution request crashed', {
      slug,
      action: selectedAction,
      error
    });

    outputEditor.setValue(
      error?.message ||
      'Unable to run tool due to a network or client error.'
    );
  } finally {
    setRunningState(false);
  }
}

document.getElementById('runBtn')?.addEventListener('click', run);
document.getElementById('copyBtn')?.addEventListener('click', () =>
  navigator.clipboard.writeText(outputEditor.getValue())
);
document.getElementById('downloadBtn')?.addEventListener('click', () => {
  const blob = new Blob([outputEditor.getValue()], { type: 'text/plain' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `${slug}-output.txt`;
  anchor.click();
});

window.ToolNexusRun = run;
