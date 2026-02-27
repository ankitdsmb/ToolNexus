const OVERLAY_ID = 'tool-runtime-crash-overlay';

function toDiagnosticPayload(options = {}) {
  return {
    toolSlug: options.toolSlug ?? 'unknown-tool',
    phase: options.phase ?? 'unknown-phase',
    errorMessage: options.errorMessage ?? 'Unknown runtime error',
    stack: options.stack ?? '',
    runtimeIdentity: options.runtimeIdentity ?? null,
    classification: options.classification ?? 'unclassified',
    timestamp: new Date().toISOString()
  };
}

function ensureOverlayRoot(root) {
  if (!root) {
    return null;
  }

  const computedPosition = globalThis.getComputedStyle?.(root)?.position;
  if (!computedPosition || computedPosition === 'static') {
    root.style.position = 'relative';
  }

  return root;
}

function toShortStack(stack) {
  if (!stack) {
    return 'No stack trace available.';
  }

  return String(stack).split('\n').slice(0, 8).join('\n');
}

async function copyDiagnostics(payload) {
  const raw = JSON.stringify(payload, null, 2);
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(raw);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = raw;
  textArea.setAttribute('readonly', 'true');
  textArea.style.position = 'absolute';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
}

export function createRuntimeCrashOverlay(options = {}) {
  const root = ensureOverlayRoot(options.root);
  if (!root) {
    return null;
  }

  root.querySelector(`#${OVERLAY_ID}`)?.remove();

  const diagnostics = toDiagnosticPayload(options);
  const overlay = document.createElement('section');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('data-runtime-crash-overlay', 'true');
  overlay.style.cssText = [
    'position:absolute',
    'inset:0',
    'z-index:9999',
    'background:rgba(125, 16, 16, 0.86)',
    'color:#ffe8e8',
    'display:flex',
    'align-items:flex-start',
    'justify-content:center',
    'padding:24px',
    'overflow:auto',
    'font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
  ].join(';');

  const panel = document.createElement('div');
  panel.style.cssText = [
    'max-width:900px',
    'width:100%',
    'background:rgba(36, 10, 10, 0.95)',
    'border:1px solid rgba(255, 148, 148, 0.85)',
    'border-radius:8px',
    'box-shadow:0 10px 30px rgba(0,0,0,0.45)',
    'padding:16px'
  ].join(';');

  panel.innerHTML = `
    <h2 style="margin:0 0 8px;font-size:18px;">Tool Runtime Crash (Admin Only)</h2>
    <p style="margin:0 0 4px;"><strong>Tool:</strong> ${diagnostics.toolSlug}</p>
    <p style="margin:0 0 4px;"><strong>Phase:</strong> ${diagnostics.phase}</p>
    <p style="margin:0 0 12px;"><strong>Runtime:</strong> ${diagnostics.runtimeIdentity?.runtimeType ?? 'unknown'} / ${diagnostics.runtimeIdentity?.resolutionMode ?? 'unknown'}</p>
    <p style="margin:0 0 4px;"><strong>Error:</strong></p>
    <pre style="margin:0 0 12px;white-space:pre-wrap;">${diagnostics.errorMessage}</pre>
    <p style="margin:0 0 4px;"><strong>Stack:</strong></p>
    <pre style="margin:0 0 16px;white-space:pre-wrap;max-height:180px;overflow:auto;">${toShortStack(diagnostics.stack)}</pre>
    <div style="display:flex;gap:8px;">
      <button type="button" data-action="copy" style="padding:8px 12px;border:1px solid #ff9a9a;background:#381313;color:#ffe8e8;border-radius:4px;cursor:pointer;">Copy diagnostics</button>
      <button type="button" data-action="dismiss" style="padding:8px 12px;border:1px solid #ffb3b3;background:transparent;color:#ffe8e8;border-radius:4px;cursor:pointer;">Dismiss</button>
    </div>
  `;

  overlay.appendChild(panel);
  root.appendChild(overlay);

  const copyButton = panel.querySelector('[data-action="copy"]');
  copyButton?.addEventListener('click', async () => {
    try {
      await copyDiagnostics(diagnostics);
      copyButton.textContent = 'Copied';
    } catch {
      copyButton.textContent = 'Copy failed';
    }
  });

  panel.querySelector('[data-action="dismiss"]')?.addEventListener('click', () => {
    overlay.style.display = 'none';
  });

  return {
    overlay,
    diagnostics,
    dismiss() {
      overlay.style.display = 'none';
    }
  };
}
