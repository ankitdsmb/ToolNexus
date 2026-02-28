const RUN_ENDPOINT = '/api/tools/document-converter/run';

export async function runTool(action, input) {
  const normalizedAction = String(action ?? '').trim().toLowerCase();
  if (normalizedAction !== 'convert') {
    throw new Error(`Unsupported action: ${action}`);
  }

  if (!input?.file) {
    throw new Error('A file is required for conversion.');
  }

  const form = new FormData();
  form.append('file', input.file);
  form.append('mode', String(input.mode ?? ''));

  const response = await fetch(RUN_ENDPOINT, {
    method: 'POST',
    body: form
  });

  if (!response.ok) {
    let message = 'Conversion failed.';
    try {
      const payload = await response.json();
      message = payload?.error || message;
    } catch {
      // ignore malformed errors
    }

    throw new Error(message);
  }

  const diagnosticsHeader = response.headers.get('X-ToolNexus-Diagnostics');
  const executionTimeMs = Number(response.headers.get('X-ToolNexus-ExecutionTimeMs') || 0);
  const outputFileName = response.headers.get('X-ToolNexus-OutputFileName') || 'converted-output';

  let diagnostics = {};
  if (diagnosticsHeader) {
    try {
      diagnostics = JSON.parse(diagnosticsHeader);
    } catch {
      diagnostics = {};
    }
  }

  const blob = await response.blob();

  return {
    blob,
    outputFileName,
    executionTimeMs,
    diagnostics
  };
}
