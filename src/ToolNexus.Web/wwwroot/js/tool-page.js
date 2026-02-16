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
  const response = await fetch(`${apiBase}/api/v1/tools/${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: actionSelect.value, input: inputEditor.getValue(), options: {} })
  });

  const result = await response.json();
  outputEditor.setValue(result.output || result.error || 'No output');
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
