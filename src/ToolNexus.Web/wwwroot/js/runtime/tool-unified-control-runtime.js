const DEFAULT_ICON = 'terminal';
const INLINE_PREVIEW_LIMIT = 320;
const LARGE_RESULT_LIMIT = 960;

const ICON_MAP = {
  terminal: '{ }',
  braces: '{ }',
  json: '{}',
  code: '</>',
  bug: '◉',
  search: '⌕',
  transform: '⇄',
  hash: '#',
  shield: '⛨',
  database: '◫',
  globe: '◌'
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeIcon(iconName) {
  const normalized = String(iconName ?? '').trim().toLowerCase();
  return normalized || DEFAULT_ICON;
}

function iconGlyph(iconName) {
  return ICON_MAP[normalizeIcon(iconName)] ?? ICON_MAP[DEFAULT_ICON];
}

function toPrettyOutput(result) {
  if (result === null || result === undefined) {
    return '';
  }

  if (typeof result === 'string') {
    const trimmed = result.trim();
    if (!trimmed) {
      return '';
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.stringify(JSON.parse(trimmed), null, 2);
      } catch {
        return result;
      }
    }

    return result;
  }

  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

export function renderUnifiedToolControl(root, {
  slug,
  title,
  subtitle,
  icon,
  runLabel = 'Run',
  inputLabel = 'Input',
  outputLabel = 'Output'
} = {}) {
  if (!root) {
    return null;
  }

  const safeSlug = escapeHtml(slug || 'tool');
  const safeTitle = escapeHtml(title || slug || 'Tool');
  const safeSubtitle = escapeHtml(subtitle || 'Unified runtime control');
  const safeInputLabel = escapeHtml(inputLabel);
  const safeOutputLabel = escapeHtml(outputLabel);

  root.innerHTML = `
    <section class="tool-page tn-unified-tool" data-slug="${safeSlug}" data-template-contract="unified-control" data-tool-root="true">
      <header class="tn-unified-tool__header" data-tool-header="true">
        <span class="tn-unified-tool__icon" aria-hidden="true">${iconGlyph(icon)}</span>
        <div class="tn-unified-tool__meta">
          <h1 class="tn-unified-tool__title">${safeTitle}</h1>
          <p class="tn-unified-tool__subtitle">${safeSubtitle}</p>
        </div>
      </header>

      <section class="tn-unified-tool__body" data-tool-body="true">
        <label class="tn-unified-tool__input-label" for="inputEditor">${safeInputLabel}</label>
        <div class="tn-unified-tool__controls">
          <textarea id="inputEditor" class="tn-unified-tool__input" rows="8" data-tool-input="true" placeholder="Paste or type input..."></textarea>
          <button id="runToolBtn" class="tool-btn tool-btn--primary tn-unified-tool__run" type="button" data-tool-actions="true">${escapeHtml(runLabel)}</button>
        </div>

        <section class="tn-unified-tool__output" data-tool-output="true" aria-live="polite">
          <p class="tn-unified-tool__output-title">${safeOutputLabel}</p>
          <pre id="outputInlinePreview" class="tn-unified-tool__inline">Awaiting execution…</pre>
          <details id="outputExpand" class="tn-unified-tool__details" hidden>
            <summary>Expanded result</summary>
            <pre id="outputField" class="tn-unified-tool__expanded"></pre>
          </details>
          <pre id="outputFieldInline" class="tn-unified-tool__hidden-output" hidden></pre>
        </section>
      </section>
    </section>
  `;

  const input = root.querySelector('#inputEditor');
  const runButton = root.querySelector('#runToolBtn');
  const inlineOutput = root.querySelector('#outputInlinePreview');
  const expandedOutput = root.querySelector('#outputField');
  const expandable = root.querySelector('#outputExpand');
  const hiddenOutput = root.querySelector('#outputFieldInline');

  const applyOutput = (rawResult) => {
    const pretty = toPrettyOutput(rawResult);
    const inlineValue = pretty.length > INLINE_PREVIEW_LIMIT
      ? `${pretty.slice(0, INLINE_PREVIEW_LIMIT)}…`
      : pretty;

    if (inlineOutput) {
      inlineOutput.textContent = inlineValue || 'No output generated.';
    }

    if (expandedOutput) {
      expandedOutput.textContent = pretty;
    }

    if (hiddenOutput) {
      hiddenOutput.textContent = pretty;
    }

    if (expandable) {
      const shouldExpand = pretty.length > LARGE_RESULT_LIMIT || pretty.includes('\n');
      expandable.hidden = !shouldExpand;
      if (!shouldExpand) {
        expandable.open = false;
      }
    }

    return pretty;
  };

  return {
    root,
    input,
    runButton,
    inlineOutput,
    expandedOutput,
    applyOutput,
    setLoading(isLoading) {
      if (!runButton) {
        return;
      }

      runButton.disabled = isLoading;
      runButton.textContent = isLoading ? 'Running…' : runLabel;
    }
  };
}

export function createUnifiedToolControlRuntime({ root, slug, manifest, config, render = true } = {}) {
  let currentControl = null;

  const ensureControl = (options = {}) => {
    currentControl = renderUnifiedToolControl(root, {
      slug,
      title: options.title ?? manifest?.title ?? config?.tool?.title ?? slug,
      subtitle: options.subtitle ?? manifest?.description ?? config?.tool?.seoDescription ?? 'Execute fast local transformations.',
      icon: options.icon ?? manifest?.icon ?? config?.tool?.icon ?? DEFAULT_ICON,
      runLabel: options.runLabel ?? manifest?.runLabel ?? 'Run',
      inputLabel: options.inputLabel ?? 'Input',
      outputLabel: options.outputLabel ?? 'Output'
    });

    return currentControl;
  };

  if (render) {
    ensureControl();
  }

  return {
    get control() {
      return currentControl;
    },
    applyOutput(result) {
      return currentControl?.applyOutput?.(result) ?? toPrettyOutput(result);
    },
    setLoading(isLoading) {
      currentControl?.setLoading?.(isLoading);
    },
    useUnifiedToolControl(options = {}) {
      return ensureControl(options);
    }
  };
}
