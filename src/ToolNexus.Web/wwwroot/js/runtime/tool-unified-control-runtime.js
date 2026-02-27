const INLINE_PREVIEW_LIMIT = 480;
const EXECUTION_STATES = Object.freeze({
  idle: {
    label: 'Idle · Ready for request',
    tone: 'neutral'
  },
  validating: {
    label: 'Validating · Checking input',
    tone: 'progress'
  },
  running: {
    label: 'Running · Authority and runtime active',
    tone: 'progress'
  },
  streaming: {
    label: 'Streaming · Output evidence arriving',
    tone: 'progress'
  },
  success: {
    label: 'Success · Execution complete',
    tone: 'success'
  },
  warning: {
    label: 'Warning · Completed with runtime notes',
    tone: 'warning'
  },
  failed: {
    label: 'Failed · Execution did not complete',
    tone: 'danger'
  }
});

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

function createOutputContent(doc) {
  const output = doc.createElement('section');
  output.className = 'tn-unified-tool-control__output';
  output.innerHTML = `
    <section class="tn-unified-tool-control__output-block tn-unified-tool-control__output-block--primary" data-output-tier="primary">
      <p class="tn-unified-tool-control__output-label">Primary result</p>
      <pre class="tn-unified-tool-control__preview">No output yet.</pre>
      <details class="tn-unified-tool-control__details">
        <summary>Expanded result</summary>
        <pre class="tn-unified-tool-control__result"></pre>
      </details>
    </section>
    <section class="tn-unified-tool-control__output-block" data-output-tier="supporting">
      <p class="tn-unified-tool-control__output-label">Supporting explanation</p>
      <pre class="tn-unified-tool-control__supporting">Awaiting execution context.</pre>
    </section>
    <section class="tn-unified-tool-control__output-block" data-output-tier="metadata">
      <p class="tn-unified-tool-control__output-label">Metadata</p>
      <pre class="tn-unified-tool-control__metadata">No metadata yet.</pre>
    </section>
    <section class="tn-unified-tool-control__output-block" data-output-tier="diagnostics">
      <p class="tn-unified-tool-control__output-label">Runtime diagnostics</p>
      <pre class="tn-unified-tool-control__diagnostics">No diagnostics reported.</pre>
    </section>
  `;
  return output;
}

function pickFirstValue(source, keys = []) {
  for (const key of keys) {
    if (key in source && source[key] !== undefined && source[key] !== null && source[key] !== '') {
      return source[key];
    }
  }

  return null;
}

function splitOutputPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      primary: payload,
      supporting: null,
      metadata: null,
      diagnostics: null,
      hasWarnings: false
    };
  }

  const primary = pickFirstValue(payload, ['result', 'output', 'data', 'value']) ?? payload;
  const supporting = pickFirstValue(payload, ['explanation', 'guide', 'summary', 'message', 'details']);
  const metadata = pickFirstValue(payload, ['metadata', 'meta', 'execution', 'snapshot', 'conformance', 'authority']);
  const diagnostics = pickFirstValue(payload, ['diagnostics', 'runtimeDiagnostics', 'logs', 'trace', 'errors', 'warnings']);
  const warningList = payload?.warnings;
  const hasWarnings = Array.isArray(warningList)
    ? warningList.length > 0
    : Boolean(warningList);

  return {
    primary,
    supporting,
    metadata,
    diagnostics,
    hasWarnings
  };
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
  const toolRoot = root?.querySelector?.('[data-tool-shell]') || root;
  if (!toolRoot) {
    return null;
  }

  const contractContext = toolRoot.querySelector('[data-tool-context]');
  const contractInput = toolRoot.querySelector('[data-tool-input]');
  const contractStatus = toolRoot.querySelector('[data-tool-status]');
  const contractOutput = toolRoot.querySelector('[data-tool-output]');
  const contractFollowup = toolRoot.querySelector('[data-tool-followup]');
  const hasContractZones = Boolean(contractContext && contractInput && contractStatus && contractOutput && contractFollowup);

  if (!hasContractZones) {
    return null;
  }

  const shell = toolRoot;
  shell.classList.add('tn-unified-tool-control', 'tn-tool-shell', 'tool-auto-runtime');
  shell.dataset.toolSlug = slug ?? '';
  shell.dataset.executionState = 'idle';

  const header = doc.createElement('header');
  header.className = 'tn-unified-tool-control__header tn-tool-header';
  header.innerHTML = `
    <span class="tn-unified-tool-control__icon" aria-hidden="true">${escapeHtml(resolveIcon(icon ?? manifest?.icon))}</span>
    <div class="tn-unified-tool-control__title-wrap">
      <h2>${escapeHtml(title ?? normalizeTitle(slug, manifest))}</h2>
      <p>${escapeHtml(subtitle ?? resolveSubtitle(manifest))}</p>
    </div>
  `;

  const inputArea = contractInput;
  inputArea.className = 'tn-unified-tool-control__input';

  const actions = contractFollowup;
  actions.className = 'tn-unified-tool-control__actions';

  const runButton = doc.createElement('button');
  runButton.type = 'button';
  runButton.className = 'tool-btn tool-btn--primary tn-unified-tool-control__run';
  runButton.textContent = 'Run';

  const status = doc.createElement('p');
  status.className = 'tn-unified-tool-control__status';
  status.dataset.executionState = 'idle';
  status.textContent = EXECUTION_STATES.idle.label;
  status.setAttribute('role', 'status');

  const suggestionBadge = doc.createElement('button');
  suggestionBadge.type = 'button';
  suggestionBadge.className = 'tool-btn tn-unified-tool-control__suggestion-badge';
  suggestionBadge.textContent = '⚡ Suggested Tool';
  suggestionBadge.hidden = true;

  const suggestionReason = doc.createElement('span');
  suggestionReason.className = 'tn-unified-tool-control__suggestion-reason';
  suggestionReason.hidden = true;

  actions.replaceChildren(runButton, suggestionBadge, suggestionReason);
  contractStatus.replaceChildren(status);

  const output = contractOutput;
  output.className = 'tn-unified-tool-control__output';
  const outputContent = createOutputContent(doc);
  output.innerHTML = outputContent.innerHTML;

  const preview = output.querySelector('.tn-unified-tool-control__preview');
  const details = output.querySelector('.tn-unified-tool-control__details');
  const result = output.querySelector('.tn-unified-tool-control__result');
  const supporting = output.querySelector('.tn-unified-tool-control__supporting');
  const metadata = output.querySelector('.tn-unified-tool-control__metadata');
  const diagnostics = output.querySelector('.tn-unified-tool-control__diagnostics');
  details.hidden = true;

  const errors = doc.createElement('div');
  errors.className = 'tn-unified-tool-control__errors';

  if (contractContext) {
    contractContext.innerHTML = header.innerHTML;
  }
  inputArea.replaceChildren();
  output.append(errors);

  return {
    shell,
    inputArea,
    actions,
    runButton,
    suggestionBadge,
    suggestionReason,
    status,
    preview,
    details,
    result,
    errors,
    setStatus(stateOrLabel, overrideLabel) {
      const normalized = String(stateOrLabel ?? '').trim().toLowerCase();
      const mapped = EXECUTION_STATES[normalized];
      if (mapped) {
        status.dataset.executionState = normalized;
        shell.dataset.executionState = normalized;
        status.dataset.executionTone = mapped.tone;
        status.textContent = overrideLabel || mapped.label;
        return;
      }

      status.textContent = overrideLabel || stateOrLabel;
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
    hideSuggestion() {
      suggestionBadge.hidden = true;
      suggestionBadge.dataset.toolId = '';
      suggestionBadge.dataset.contextType = '';
      suggestionReason.hidden = true;
      suggestionReason.textContent = '';
    },
    showSuggestion({ toolId, reason, contextType, confidence } = {}) {
      if (!toolId) {
        this.hideSuggestion();
        return;
      }

      suggestionBadge.hidden = false;
      suggestionBadge.dataset.toolId = toolId;
      suggestionBadge.dataset.contextType = contextType ?? '';
      suggestionBadge.dataset.confidence = confidence ? String(confidence) : '';
      suggestionReason.hidden = !reason;
      suggestionReason.textContent = reason ?? '';
    },
    renderResult(payload) {
      const hierarchy = splitOutputPayload(payload);
      const serialized = safeStringify(payload);
      preview.textContent = toShortText(hierarchy.primary);
      result.textContent = serialized;
      supporting.textContent = hierarchy.supporting ? safeStringify(hierarchy.supporting) : 'No supporting explanation returned.';
      metadata.textContent = hierarchy.metadata ? safeStringify(hierarchy.metadata) : 'No metadata returned.';
      diagnostics.textContent = hierarchy.diagnostics ? safeStringify(hierarchy.diagnostics) : 'No diagnostics reported.';
      details.hidden = serialized.length <= INLINE_PREVIEW_LIMIT;
      details.open = false;
      return hierarchy;
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
