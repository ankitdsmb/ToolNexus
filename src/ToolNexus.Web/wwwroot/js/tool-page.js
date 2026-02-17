const page = document.querySelector('.tool-page');
if (!page) {
  throw new Error('Tool page not found');
}

const slug = page.dataset.slug;
const apiBase = page.dataset.apiBase;
const inputTextArea = document.getElementById('inputEditor');
const outputTextArea = document.getElementById('outputEditor');
const actionSelect = document.getElementById('actionSelect');

const inputEditor = CodeMirror.fromTextArea(inputTextArea, { lineNumbers: true, mode: 'application/json', theme: 'default' });
const outputEditor = CodeMirror.fromTextArea(outputTextArea, { lineNumbers: true, mode: 'application/json', readOnly: true });

async function run() {
  const selectedAction = actionSelect?.value ?? '';
  const requestBody = {
    action: selectedAction,
    input: inputEditor.getValue()
  };

  try {
    const response = await fetch(`${apiBase}/api/v1/tools/${encodeURIComponent(slug)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
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

      outputEditor.setValue(message);
      return;
    }

    outputEditor.setValue(result?.output || result?.error || 'No output');
  } catch (error) {
    console.error('Tool execution request crashed', {
      slug,
      action: selectedAction,
      error
    });
    outputEditor.setValue('Unable to run tool due to a network or client error.');
  }
}

document.getElementById('runBtn')?.addEventListener('click', run);
document.getElementById('copyBtn')?.addEventListener('click', () => navigator.clipboard.writeText(outputEditor.getValue()));
document.getElementById('downloadBtn')?.addEventListener('click', () => {
  const blob = new Blob([outputEditor.getValue()], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${slug}-output.txt`;
  a.click();
});

window.ToolNexusRun = run;
