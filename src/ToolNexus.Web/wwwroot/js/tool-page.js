const page = document.querySelector('.tool-page');
if (!page) {
  throw new Error('Tool page not found');
}

const slug = page.dataset.slug;
const apiBase = page.dataset.apiBase;
const inputTextArea = document.getElementById('inputEditor');
const outputTextArea = document.getElementById('outputEditor');
const actionSelect = document.getElementById('actionSelect');
const runButton = document.getElementById('runBtn');
const spinner = document.getElementById('runSpinner');

const inputEditor = CodeMirror.fromTextArea(inputTextArea, { lineNumbers: true, mode: 'application/json', theme: 'default' });
const outputEditor = CodeMirror.fromTextArea(outputTextArea, { lineNumbers: true, mode: 'application/json', readOnly: true });

function setRunningState(isRunning) {
  runButton.disabled = isRunning;
  runButton.setAttribute('aria-busy', String(isRunning));
  runButton.textContent = isRunning ? 'Running...' : 'Run';
  spinner.hidden = !isRunning;
}

async function run() {
  try {
    setRunningState(true);

    const response = await fetch(`${apiBase}/api/v1/tools/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: actionSelect.value, input: inputEditor.getValue() })
    });

    const result = await response.json();
    outputEditor.setValue(result.output || result.error || 'No output');
  } catch {
    outputEditor.setValue('Unable to process the request right now. Please try again.');
  } finally {
    setRunningState(false);
  }
}

runButton?.addEventListener('click', run);
document.getElementById('copyBtn')?.addEventListener('click', () => navigator.clipboard.writeText(outputEditor.getValue()));
document.getElementById('downloadBtn')?.addEventListener('click', () => {
  const blob = new Blob([outputEditor.getValue()], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${slug}-output.txt`;
  a.click();
});

window.ToolNexusRun = run;
