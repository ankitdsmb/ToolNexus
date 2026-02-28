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
      { label: 'Policy', value: badges?.policy ?? 'Admitted' }
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

    const ensureTier = (tier) => {
      let section = outputHost.querySelector(`[data-output-tier="${tier}"]`);
      if (!section) {
        section = doc.createElement('section');
        section.className = tier === 'primary'
          ? 'tn-unified-tool-control__output-block tn-unified-tool-control__output-block--primary'
          : 'tn-unified-tool-control__output-block';
        section.dataset.outputTier = tier;
        outputHost.append(section);
      }

      return section;
    };

    const primary = ensureTier('primary');
    if (!primary.querySelector('.tn-unified-tool-control__output-label')) {
      const label = doc.createElement('p');
      label.className = 'tn-unified-tool-control__output-label';
      label.textContent = 'Primary result';
      primary.append(label);
    }
    if (!primary.querySelector('.tn-unified-tool-control__preview')) {
      const preview = doc.createElement('pre');
      preview.className = 'tn-unified-tool-control__preview';
      preview.textContent = 'No output yet.';
      primary.append(preview);
    }
    if (!primary.querySelector('.tn-unified-tool-control__details')) {
      const details = doc.createElement('details');
      details.className = 'tn-unified-tool-control__details';
      details.hidden = true;
      const summary = doc.createElement('summary');
      summary.textContent = 'Expanded result';
      const result = doc.createElement('pre');
      result.className = 'tn-unified-tool-control__result';
      details.append(summary, result);
      primary.append(details);
    }

    const supporting = ensureTier('supporting');
    if (!supporting.querySelector('.tn-unified-tool-control__output-label')) {
      const label = doc.createElement('p');
      label.className = 'tn-unified-tool-control__output-label';
      label.textContent = 'Explanation';
      supporting.append(label);
    }
    const ensureSupportingLine = (layer, message) => {
      if (supporting.querySelector(`[data-ai-layer="${layer}"]`)) {
        return;
      }
      const line = doc.createElement('p');
      line.className = 'tn-unified-tool-control__supporting';
      line.dataset.aiLayer = layer;
      line.textContent = message;
      supporting.append(line);
    };
    ensureSupportingLine('interpretation', 'Interpretation summary: Awaiting execution context.');
    ensureSupportingLine('classification-why', 'Why this result is classified this way: Awaiting runtime evidence.');
    ensureSupportingLine('confidence', 'Confidence: Pending execution.');
    ensureSupportingLine('next-action', 'Next recommended action: Run execution to generate guidance.');

    const metadata = ensureTier('metadata');
    if (!metadata.querySelector('.tn-unified-tool-control__output-label')) {
      const label = doc.createElement('p');
      label.className = 'tn-unified-tool-control__output-label';
      label.textContent = 'Metadata';
      metadata.append(label);
    }
    if (!metadata.querySelector('.tn-unified-tool-control__metadata')) {
      const node = doc.createElement('pre');
      node.className = 'tn-unified-tool-control__metadata';
      node.textContent = 'No metadata yet.';
      metadata.append(node);
    }

    const diagnostics = ensureTier('diagnostics');
    if (!diagnostics.querySelector('.tn-unified-tool-control__output-label')) {
      const label = doc.createElement('p');
      label.className = 'tn-unified-tool-control__output-label';
      label.textContent = 'Runtime diagnostics';
      diagnostics.append(label);
    }
    if (!diagnostics.querySelector('.tn-unified-tool-control__diagnostics')) {
      const node = doc.createElement('pre');
      node.className = 'tn-unified-tool-control__diagnostics';
      node.textContent = 'No diagnostics reported.';
      diagnostics.append(node);
    }

    return { primary, supporting, metadata, diagnostics };
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
