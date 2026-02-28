function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeText(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function ensureClass(element, classNames = []) {
  if (!element) {
    return;
  }

  for (const className of classNames) {
    if (className) {
      element.classList.add(className);
    }
  }
}

function collapseSection(section, hasContent) {
  if (!section) {
    return;
  }

  section.hidden = !hasContent;
}

export function createToolPresentationEngine({ doc = document } = {}) {
  function renderIdentityBlock({
    context,
    icon,
    title,
    intent,
    meta,
    badges
  } = {}) {
    if (!context) {
      return null;
    }

    ensureClass(context, ['tn-unified-tool-control__header', 'tn-tool-header']);
    const normalizedBadges = [
      { label: 'Authority', value: badges?.authority ?? 'Governed' },
      { label: 'Runtime', value: badges?.runtime ?? 'Unified' },
      { label: 'Policy', value: badges?.policy ?? 'Admitted' },
      { label: 'Status', value: badges?.status ?? 'Ready' }
    ];

    const badgesMarkup = normalizedBadges
      .map((badge) => `<span class="tn-unified-tool-control__capsule"><span class="tn-unified-tool-control__capsule-label">${escapeHtml(normalizeText(badge.label))}</span><span class="tn-unified-tool-control__capsule-value">${escapeHtml(normalizeText(badge.value))}</span></span>`)
      .join('');

    context.innerHTML = `
      <span class="tn-unified-tool-control__icon" aria-hidden="true">${escapeHtml(icon)}</span>
      <div class="tn-unified-tool-control__title-wrap">
        <h2>${escapeHtml(normalizeText(title, 'Tool runtime'))}</h2>
        <p>${escapeHtml(normalizeText(intent, 'Unified tool execution control.'))}</p>
        <p class="tn-unified-tool-control__meta">${escapeHtml(normalizeText(meta, 'Authority-governed execution context active.'))}</p>
      </div>
      <div class="tn-unified-tool-control__capsules" aria-label="Execution context badges">${badgesMarkup}</div>
    `;

    return context;
  }

  function styleInputPanel(inputPanel) {
    if (!inputPanel) {
      return null;
    }

    ensureClass(inputPanel, ['tn-unified-tool-control__input', 'tn-unified-tool-control__input-card']);
    return inputPanel;
  }

  function renderActionHierarchy({ actionsHost, runButton, executionHint, secondaryNodes = [] } = {}) {
    if (!actionsHost || !runButton) {
      return null;
    }

    ensureClass(actionsHost, ['tn-unified-tool-control__actions']);
    ensureClass(runButton, ['tool-btn', 'tool-btn--primary', 'tn-unified-tool-control__run']);

    const primaryActions = doc.createElement('div');
    primaryActions.className = 'tn-unified-tool-control__actions-primary';

    const secondaryActions = doc.createElement('div');
    secondaryActions.className = 'tn-unified-tool-control__actions-secondary';

    const hintNode = executionHint ?? doc.createElement('span');
    if (!executionHint) {
      hintNode.textContent = 'Primary execution action';
    }
    ensureClass(hintNode, ['tn-unified-tool-control__execution-hint']);

    primaryActions.replaceChildren(runButton, hintNode);

    const secondaryItems = Array.isArray(secondaryNodes)
      ? secondaryNodes.filter(Boolean)
      : [];

    if (secondaryItems.length) {
      secondaryActions.replaceChildren(...secondaryItems);
    }

    actionsHost.replaceChildren(primaryActions, secondaryActions);

    return {
      primaryActions,
      secondaryActions
    };
  }

  function renderOutputEvidence(outputHost) {
    if (!outputHost) {
      return null;
    }

    ensureClass(outputHost, ['tn-unified-tool-control__output']);
    outputHost.innerHTML = `
      <section class="tn-unified-tool-control__output-block tn-unified-tool-control__output-block--primary" data-output-tier="primary">
        <p class="tn-unified-tool-control__output-label">Primary result</p>
        <pre class="tn-unified-tool-control__preview">No output yet.</pre>
        <details class="tn-unified-tool-control__details" hidden>
          <summary>Expanded result</summary>
          <pre class="tn-unified-tool-control__result"></pre>
        </details>
      </section>
      <section class="tn-unified-tool-control__output-block" data-output-tier="supporting">
        <p class="tn-unified-tool-control__output-label">Explanation</p>
        <p class="tn-unified-tool-control__supporting" data-ai-layer="interpretation">Interpretation summary: Awaiting execution context.</p>
        <p class="tn-unified-tool-control__supporting" data-ai-layer="classification-why">Why this result is classified this way: Awaiting runtime evidence.</p>
        <p class="tn-unified-tool-control__supporting" data-ai-layer="confidence">Confidence: Pending execution.</p>
        <p class="tn-unified-tool-control__supporting" data-ai-layer="next-action">Next recommended action: Run execution to generate guidance.</p>
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

    return {
      primary: outputHost.querySelector('[data-output-tier="primary"]'),
      supporting: outputHost.querySelector('[data-output-tier="supporting"]'),
      metadata: outputHost.querySelector('[data-output-tier="metadata"]'),
      diagnostics: outputHost.querySelector('[data-output-tier="diagnostics"]')
    };
  }

  function applyOutputVisibility({ outputHost, supporting, metadata, diagnostics } = {}) {
    if (!outputHost) {
      return;
    }

    const normalizedSupporting = normalizeText(supporting);
    const normalizedMetadata = normalizeText(metadata);
    const normalizedDiagnostics = normalizeText(diagnostics);

    collapseSection(outputHost.querySelector('[data-output-tier="supporting"]'), Boolean(normalizedSupporting));
    collapseSection(outputHost.querySelector('[data-output-tier="metadata"]'), Boolean(normalizedMetadata));
    collapseSection(outputHost.querySelector('[data-output-tier="diagnostics"]'), Boolean(normalizedDiagnostics));
  }

  function applyArticleTypography(scope = doc) {
    if (!scope?.querySelectorAll) {
      return 0;
    }

    const candidates = scope.querySelectorAll('.tool-seo, [data-tool-article], [data-tool-content="article"]');
    for (const candidate of candidates) {
      ensureClass(candidate, ['tool-article-prose']);
    }

    return candidates.length;
  }

  return {
    renderIdentityBlock,
    styleInputPanel,
    renderActionHierarchy,
    renderOutputEvidence,
    applyOutputVisibility,
    applyArticleTypography
  };
}
