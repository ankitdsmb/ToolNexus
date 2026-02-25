const INLINE_PREVIEW_LIMIT = 480;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeStringify(payload) {
  if (typeof payload === 'string') {
    return payload;
  }

  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return 'Unable to serialize response payload.';
  }
}

function toShortText(value) {
  const serialized = safeStringify(value);
  if (serialized.length <= INLINE_PREVIEW_LIMIT) {
    return serialized;
  }

  return `${serialized.slice(0, INLINE_PREVIEW_LIMIT)}…`;
}

function normalizeTitle(slug, manifest) {
  return manifest?.title
    ?? manifest?.name
    ?? globalThis.window?.ToolNexusConfig?.tool?.title
    ?? slug
    ?? 'Tool runtime';
}

function resolveSubtitle(manifest) {
  return manifest?.description
    ?? manifest?.summary
    ?? globalThis.window?.ToolNexusConfig?.tool?.description
    ?? 'Unified tool control';
}

function resolveIcon(iconName = '') {
  const normalized = String(iconName || '').trim().toLowerCase();
  const icons = {
    code: '</>',
    json: '{ }',
    terminal: '>_',
    database: 'DB',
    api: 'API',
    regex: '.*',
    text: 'TXT',
    convert: '⇄',
    hash: '#',
    web: 'WWW'
  };

  return icons[normalized] ?? icons.code;
}

export function createUnifiedToolControl({
  root,
  doc = root?.ownerDocument ?? document,
  slug,
  manifest,
  title,
  subtitle,
  icon
} = {}) {
  const shell = doc.createElement('section');
  shell.className = 'tn-unified-tool-control tn-tool-shell tool-auto-runtime';
  shell.dataset.toolSlug = slug ?? '';

  const header = doc.createElement('header');
  header.className = 'tn-unified-tool-control__header tn-tool-header';
  header.innerHTML = `
    <span class="tn-unified-tool-control__icon" aria-hidden="true">${escapeHtml(resolveIcon(icon ?? manifest?.icon))}</span>
    <div class="tn-unified-tool-control__title-wrap">
      <h2>${escapeHtml(title ?? normalizeTitle(slug, manifest))}</h2>
      <p>${escapeHtml(subtitle ?? resolveSubtitle(manifest))}</p>
    </div>
  `;

  const body = doc.createElement('section');
  body.className = 'tn-unified-tool-control__body';

  const inputArea = doc.createElement('section');
  inputArea.className = 'tn-unified-tool-control__input';

  const actions = doc.createElement('div');
  actions.className = 'tn-unified-tool-control__actions';

  const runButton = doc.createElement('button');
  runButton.type = 'button';
  runButton.className = 'tool-btn tool-btn--primary tn-unified-tool-control__run';
  runButton.textContent = 'Run';

  const status = doc.createElement('p');
  status.className = 'tn-unified-tool-control__status';
  status.textContent = 'Ready';
  status.setAttribute('role', 'status');

  actions.append(runButton, status);

  const output = doc.createElement('section');
  output.className = 'tn-unified-tool-control__output';
  output.innerHTML = `
    <pre class="tn-unified-tool-control__preview">No output yet.</pre>
    <details class="tn-unified-tool-control__details">
      <summary>Expanded result</summary>
      <pre class="tn-unified-tool-control__result"></pre>
    </details>
  `;

  const preview = output.querySelector('.tn-unified-tool-control__preview');
  const details = output.querySelector('.tn-unified-tool-control__details');
  const result = output.querySelector('.tn-unified-tool-control__result');
  details.hidden = true;

  const errors = doc.createElement('div');
  errors.className = 'tn-unified-tool-control__errors';

  body.append(inputArea, actions, output);
  shell.append(header, body, errors);

  root.innerHTML = '';
  root.append(shell);

  return {
    shell,
    inputArea,
    actions,
    runButton,
    status,
    preview,
    details,
    result,
    errors,
    setStatus(value) {
      status.textContent = value;
    },
    showError(message) {
      const panel = doc.createElement('div');
      panel.className = 'tool-auto-runtime__error';
      panel.setAttribute('role', 'alert');
      panel.textContent = message;
      errors.append(panel);
    },
    clearErrors() {
      errors.replaceChildren();
    },
    renderResult(payload) {
      const serialized = safeStringify(payload);
      preview.textContent = toShortText(payload);
      result.textContent = serialized;
      details.hidden = serialized.length <= INLINE_PREVIEW_LIMIT;
      details.open = false;
    }
  };
}

export function useUnifiedToolControl(runtimeOrRoot, options = {}) {
  const root = runtimeOrRoot?.root ?? runtimeOrRoot;
  if (!root) {
    return null;
  }

  return createUnifiedToolControl({ root, ...options });
}
