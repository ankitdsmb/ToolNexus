const INLINE_PREVIEW_LIMIT = 480;
const OUTCOME_CLASSES = Object.freeze({
  usableSuccess: 'usable_success',
  warningPartial: 'warning_partial',
  uncertainResult: 'uncertain_result',
  failed: 'failed'
});
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
  uncertain: {
    label: 'Uncertain · Verify outcome before relying on result',
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
      <p class="tn-unified-tool-control__output-label">Interpretation layer</p>
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
      hasWarnings: false,
      warningCount: 0
    };
  }

  const primary = pickFirstValue(payload, ['result', 'output', 'data', 'value']) ?? payload;
  const supporting = pickFirstValue(payload, ['explanation', 'guide', 'summary', 'message', 'details']);
  const metadata = pickFirstValue(payload, ['metadata', 'meta', 'execution', 'snapshot', 'conformance', 'authority']);
  const diagnostics = pickFirstValue(payload, ['diagnostics', 'runtimeDiagnostics', 'logs', 'trace', 'errors', 'warnings']);
  const warningList = payload?.warnings;
  const warningCount = Array.isArray(warningList)
    ? warningList.length
    : (warningList ? 1 : 0);
  const hasWarnings = warningCount > 0;
  const diagnosticWeight = diagnostics
    ? (Array.isArray(diagnostics)
      ? diagnostics.length
      : (typeof diagnostics === 'object' ? Object.keys(diagnostics).length : 1))
    : 0;
  const metadataCompleteness = metadata
    ? (typeof metadata === 'object' ? Object.keys(metadata).length : 1)
    : 0;

  return {
    primary,
    supporting,
    metadata,
    diagnostics,
    hasWarnings,
    warningCount,
    diagnosticWeight,
    metadataCompleteness
  };
}

function classifyExecutionOutcome(hierarchy) {
  if (!hierarchy) {
    return OUTCOME_CLASSES.uncertainResult;
  }

  if (hierarchy.hasWarnings) {
    return OUTCOME_CLASSES.warningPartial;
  }

  const hasDiagnostics = Boolean(hierarchy.diagnostics);
  const hasSupporting = Boolean(hierarchy.supporting);
  const metadataCompleteness = Number(hierarchy.metadataCompleteness ?? 0);
  if (hasDiagnostics && !hasSupporting && metadataCompleteness === 0) {
    return OUTCOME_CLASSES.uncertainResult;
  }

  if (!hasSupporting && metadataCompleteness <= 1) {
    return OUTCOME_CLASSES.uncertainResult;
  }

  return OUTCOME_CLASSES.usableSuccess;
}

function resolveConfidenceLevel(outcomeClass) {
  if (outcomeClass === OUTCOME_CLASSES.warningPartial) {
    return 'cautious';
  }

  if (outcomeClass === OUTCOME_CLASSES.uncertainResult) {
    return 'limited';
  }

  if (outcomeClass === OUTCOME_CLASSES.failed) {
    return 'none';
  }

  return 'strong';
}

function resolveInterpretationSummary(hierarchy) {
  if (hierarchy.supporting) {
    return `Interpretation summary: ${toShortText(hierarchy.supporting)}`;
  }

  return 'Interpretation summary: Runtime returned raw evidence without explanatory narrative.';
}

function resolveConfidencePhrase({ confidenceLevel, evidenceCompleteness, warningCount, diagnosticWeight }) {
  if (confidenceLevel === 'cautious') {
    return `Confidence: Cautious — ${warningCount} warning signal(s) with diagnostic weight ${diagnosticWeight}.`;
  }

  if (confidenceLevel === 'limited') {
    return `Confidence: Limited — evidence completeness ${evidenceCompleteness}/3, validate against trusted baseline.`;
  }

  if (confidenceLevel === 'none') {
    return 'Confidence: None — execution did not complete; no reliable outcome available.';
  }

  return `Confidence: Strong — evidence completeness ${evidenceCompleteness}/3 with manageable diagnostic load.`;
}

function buildOutcomeExplanation({ outcomeClass, hasWarnings, hasDiagnostics, hasSupporting, metadataCompleteness, evidenceCompleteness }) {
  if (outcomeClass === OUTCOME_CLASSES.warningPartial) {
    return [
      'warnings detected in runtime evidence',
      'diagnostics indicate partial risk exposure'
    ];
  }

  if (outcomeClass === OUTCOME_CLASSES.uncertainResult) {
    const reasons = [];
    if (metadataCompleteness === 0 || !hasSupporting) {
      reasons.push('metadata or interpretation context is limited');
    }

    if (hasDiagnostics) {
      reasons.push('diagnostics are more dominant than explanatory evidence');
    }

    if (!reasons.length) {
      reasons.push(`evidence completeness is low (${evidenceCompleteness}/3)`);
    }

    return reasons;
  }

  if (outcomeClass === OUTCOME_CLASSES.failed) {
    return ['execution error path was triggered'];
  }

  return [
    'evidence completeness is high for this execution',
    hasWarnings ? 'warning signals are minimal' : 'no warnings were observed'
  ];
}

function resolveClassificationWhyLine(explanationReasons = []) {
  if (!explanationReasons.length) {
    return 'Why this result is classified this way: Observable runtime signals are still loading.';
  }

  return `Why this result is classified this way: ${explanationReasons.join('; ')}.`;
}

function resolveNextAction({ outcomeClass, repeatedWarning }) {
  if (outcomeClass === OUTCOME_CLASSES.warningPartial) {
    return repeatedWarning
      ? 'Next recommended action: Warning repeated across runs — prioritize root-cause fix, then rerun.'
      : 'Next recommended action: Inspect runtime notes, refine inputs, and rerun for cleaner conformance.';
  }

  if (outcomeClass === OUTCOME_CLASSES.uncertainResult) {
    return 'Next recommended action: Validate critical fields manually and rerun with richer context metadata.';
  }

  return 'Next recommended action: Proceed with follow-up actions; optional rerun for comparative validation.';
}

function normalizeReasonSignal(reason) {
  return String(reason ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

function buildReasonSignature(reasons = []) {
  const normalizedReasons = (Array.isArray(reasons) ? reasons : [])
    .map(normalizeReasonSignal)
    .filter(Boolean)
    .slice(0, 3);

  return normalizedReasons.join('|');
}

function resolveGuidanceType(outcomeClass) {
  if (outcomeClass === OUTCOME_CLASSES.warningPartial) {
    return 'warning';
  }

  if (outcomeClass === OUTCOME_CLASSES.uncertainResult) {
    return 'uncertain';
  }

  if (outcomeClass === OUTCOME_CLASSES.failed) {
    return 'recovery';
  }

  return 'progress';
}

export function createRuntimeObservationState() {
  return {
    repeatedOutcomeCount: 0,
    repeatedReasonPatterns: [],
    lastGuidanceType: null,
    _lastOutcomeClass: null,
    _lastReasonSignature: ''
  };
}

export function observeRuntimeReasoning(observation, runtimeReasoning) {
  const state = observation && typeof observation === 'object'
    ? observation
    : createRuntimeObservationState();
  const reasoning = runtimeReasoning ?? {};
  const outcomeClass = reasoning?.outcomeClass ?? OUTCOME_CLASSES.uncertainResult;
  const reasonSignature = buildReasonSignature(reasoning?.reasons);
  const guidanceType = resolveGuidanceType(outcomeClass);

  state.repeatedOutcomeCount = state._lastOutcomeClass === outcomeClass
    ? state.repeatedOutcomeCount + 1
    : 1;
  state.lastGuidanceType = guidanceType;

  const repeatedReasonPattern = state._lastReasonSignature && reasonSignature && state._lastReasonSignature === reasonSignature;
  if (repeatedReasonPattern) {
    const existingPattern = state.repeatedReasonPatterns.find((entry) => entry?.pattern === reasonSignature);
    if (existingPattern) {
      existingPattern.count += 1;
    } else {
      state.repeatedReasonPatterns.push({ pattern: reasonSignature, count: 2 });
    }

    if (state.repeatedReasonPatterns.length > 5) {
      state.repeatedReasonPatterns = state.repeatedReasonPatterns.slice(-5);
    }
  }

  state._lastOutcomeClass = outcomeClass;
  state._lastReasonSignature = reasonSignature;

  const hasRepeatedWarningSequence = outcomeClass === OUTCOME_CLASSES.warningPartial && state.repeatedOutcomeCount > 1;
  return {
    repeatedOutcomeClass: state.repeatedOutcomeCount > 1,
    repeatedReasonSignals: repeatedReasonPattern,
    repeatedWarningSequence: hasRepeatedWarningSequence
  };
}

export function buildObservationTonePrefix(patterns = {}) {
  if (patterns.repeatedWarningSequence) {
    return 'Similar warnings detected in recent runs.';
  }

  if (patterns.repeatedReasonSignals) {
    return 'Reasoning signals are recurring across recent runs.';
  }

  if (patterns.repeatedOutcomeClass) {
    return 'Recent runs show a similar outcome trend.';
  }

  return '';
}

export function buildAdaptiveGuidance({ outcomeClass, repeatedWarning }) {
  const reasoning = buildRuntimeReasoning({
    outcomeClass,
    repeatedWarning,
    explanationReasons: []
  });

  if (outcomeClass === OUTCOME_CLASSES.warningPartial) {
    return {
      intent: 'AI intent: Highlight partial completion and cautionary evidence for operator review.',
      guidance: `Guidance: ${reasoning.guidance.join(' ')}`
    };
  }

  if (outcomeClass === OUTCOME_CLASSES.uncertainResult) {
    return {
      intent: 'AI intent: Mark interpretation uncertainty due to low evidence completeness.',
      guidance: `Guidance: ${reasoning.guidance.join(' ')}`
    };
  }

  return {
    intent: 'AI intent: Confirm outcome is usable for workflow continuation.',
    guidance: `Guidance: ${reasoning.guidance.join(' ')}`
  };
}

export function buildAdaptiveGuidanceFromReasons({ outcomeClass, explanationReasons = [], repeatedWarning = false } = {}) {
  const reasonsLine = explanationReasons.length > 0
    ? `Because ${explanationReasons.join(' and ')}, `
    : 'Because observable runtime evidence is limited, ';

  if (outcomeClass === OUTCOME_CLASSES.warningPartial) {
    return repeatedWarning
      ? `${reasonsLine}fix the recurring warning source before rerun.`
      : `${reasonsLine}inspect warnings, adjust inputs, then rerun.`;
  }

  if (outcomeClass === OUTCOME_CLASSES.uncertainResult) {
    return `${reasonsLine}rerun with richer context and verify critical fields.`;
  }

  if (outcomeClass === OUTCOME_CLASSES.failed) {
    return `${reasonsLine}correct the execution error path and retry.`;
  }

  return `${reasonsLine}proceed with follow-up actions and optional comparative rerun.`;
}

function getDefaultGuidanceByOutcome({ outcomeClass, repeatedWarning }) {
  if (outcomeClass === OUTCOME_CLASSES.warningPartial) {
    return repeatedWarning
      ? [
        'Next step: address recurring warning pattern.',
        'Rerun: yes, after adjustment.',
        'Validation: verify impacted fields first.'
      ]
      : [
        'Next step: inspect warning diagnostics.',
        'Rerun: recommended after refining inputs.',
        'Validation: verify key outputs.'
      ];
  }

  if (outcomeClass === OUTCOME_CLASSES.uncertainResult) {
    return [
      'Next step: cross-check output with trusted reference.',
      'Rerun: recommended with fuller metadata.',
      'Validation: confirm critical values.'
    ];
  }

  if (outcomeClass === OUTCOME_CLASSES.failed) {
    return [
      'Next step: review failure diagnostics and assumptions.',
      'Rerun: recommended after correction.',
      'Validation: run pre-retry request sanity check.'
    ];
  }

  return [
    'Next step: continue through follow-up actions.',
    'Rerun: optional for comparison.',
    'Validation: spot-check downstream assumptions.'
  ];
}

function enforceRuntimeReasoningConsistency(reasoning) {
  const normalized = {
    outcomeClass: reasoning?.outcomeClass ?? OUTCOME_CLASSES.uncertainResult,
    confidenceLevel: reasoning?.confidenceLevel ?? 'limited',
    reasons: Array.isArray(reasoning?.reasons) ? reasoning.reasons.filter(Boolean) : [],
    guidance: Array.isArray(reasoning?.guidance) ? reasoning.guidance.filter(Boolean) : []
  };

  const expectedConfidence = resolveConfidenceLevel(normalized.outcomeClass);
  if (normalized.confidenceLevel !== expectedConfidence) {
    normalized.confidenceLevel = expectedConfidence;
  }

  if (normalized.reasons.length === 0) {
    normalized.reasons = ['observable runtime evidence is limited'];
  }

  if (normalized.guidance.length === 0) {
    normalized.guidance = getDefaultGuidanceByOutcome({
      outcomeClass: normalized.outcomeClass,
      repeatedWarning: false
    });
  }

  const referencesReason = normalized.guidance.some((item) => /because\s/i.test(item));
  if (!referencesReason) {
    normalized.guidance.unshift(`Because ${normalized.reasons.join(' and ')}, proceed with the following steps.`);
  }

  return normalized;
}

export function buildRuntimeReasoning({
  hierarchy,
  repeatedWarning = false,
  forcedOutcomeClass,
  additionalReasons = [],
  outcomeClass,
  explanationReasons
} = {}) {
  const hasHierarchy = Boolean(hierarchy);
  const hasSupporting = Boolean(hierarchy?.supporting);
  const hasMetadata = Boolean(hierarchy?.metadata);
  const hasDiagnostics = Boolean(hierarchy?.diagnostics);
  const evidenceCompleteness = [hasSupporting, hasMetadata, hasDiagnostics].filter(Boolean).length;
  const resolvedOutcomeClass = forcedOutcomeClass
    ?? outcomeClass
    ?? (hasHierarchy ? classifyExecutionOutcome(hierarchy) : OUTCOME_CLASSES.uncertainResult);

  const reasons = [
    ...(Array.isArray(explanationReasons)
      ? explanationReasons
      : buildOutcomeExplanation({
        outcomeClass: resolvedOutcomeClass,
        hasWarnings: Boolean(hierarchy?.hasWarnings),
        hasDiagnostics,
        hasSupporting,
        metadataCompleteness: Number(hierarchy?.metadataCompleteness ?? 0),
        evidenceCompleteness
      })),
    ...additionalReasons
  ];

  const defaultGuidance = getDefaultGuidanceByOutcome({
    outcomeClass: resolvedOutcomeClass,
    repeatedWarning
  });
  const reasonBoundGuidance = buildAdaptiveGuidanceFromReasons({
    outcomeClass: resolvedOutcomeClass,
    explanationReasons: reasons,
    repeatedWarning
  });

  return enforceRuntimeReasoningConsistency({
    outcomeClass: resolvedOutcomeClass,
    confidenceLevel: resolveConfidenceLevel(resolvedOutcomeClass),
    reasons,
    guidance: [reasonBoundGuidance, ...defaultGuidance]
  });
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

  const intent = doc.createElement('p');
  intent.className = 'tn-unified-tool-control__status-note';
  intent.textContent = 'AI intent: Prepare to execute your request through governed runtime flow.';

  const guidance = doc.createElement('p');
  guidance.className = 'tn-unified-tool-control__status-note';
  guidance.textContent = 'Guidance: Add inputs and run when ready.';

  const suggestionBadge = doc.createElement('button');
  suggestionBadge.type = 'button';
  suggestionBadge.className = 'tool-btn tn-unified-tool-control__suggestion-badge';
  suggestionBadge.textContent = '⚡ Suggested Tool';
  suggestionBadge.hidden = true;

  const suggestionReason = doc.createElement('span');
  suggestionReason.className = 'tn-unified-tool-control__suggestion-reason';
  suggestionReason.hidden = true;

  actions.replaceChildren(runButton, suggestionBadge, suggestionReason);
  contractStatus.replaceChildren(status, intent, guidance);

  const output = contractOutput;
  output.className = 'tn-unified-tool-control__output';
  const outputContent = createOutputContent(doc);
  output.innerHTML = outputContent.innerHTML;

  const preview = output.querySelector('.tn-unified-tool-control__preview');
  const details = output.querySelector('.tn-unified-tool-control__details');
  const result = output.querySelector('.tn-unified-tool-control__result');
  const supporting = output.querySelector('.tn-unified-tool-control__supporting');
  const classificationWhy = output.querySelector('[data-ai-layer="classification-why"]');
  const confidence = output.querySelector('[data-ai-layer="confidence"]');
  const nextAction = output.querySelector('[data-ai-layer="next-action"]');
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
    setIntent(message) {
      intent.textContent = message || 'AI intent: Prepare to execute your request through governed runtime flow.';
    },
    setGuidance(message) {
      guidance.textContent = message || 'Guidance: Add inputs and run when ready.';
    },
    setClassificationWhy(message) {
      classificationWhy.textContent = message || 'Why this result is classified this way: Awaiting runtime evidence.';
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
    renderResult(payload, { repeatedWarning = false, forcedOutcomeClass, additionalReasons = [] } = {}) {
      const hierarchy = splitOutputPayload(payload);
      const serialized = safeStringify(payload);
      const evidenceCompleteness = [Boolean(hierarchy.supporting), Boolean(hierarchy.metadata), Boolean(hierarchy.diagnostics)].filter(Boolean).length;
      const runtimeReasoning = buildRuntimeReasoning({
        hierarchy,
        repeatedWarning,
        forcedOutcomeClass,
        additionalReasons
      });
      const confidencePhrase = resolveConfidencePhrase({
        confidenceLevel: runtimeReasoning.confidenceLevel,
        evidenceCompleteness,
        warningCount: hierarchy.warningCount,
        diagnosticWeight: hierarchy.diagnosticWeight
      });

      preview.textContent = toShortText(hierarchy.primary);
      result.textContent = serialized;
      supporting.textContent = resolveInterpretationSummary(hierarchy);
      classificationWhy.textContent = resolveClassificationWhyLine(runtimeReasoning.reasons);
      confidence.textContent = confidencePhrase;
      nextAction.textContent = resolveNextAction({
        outcomeClass: runtimeReasoning.outcomeClass,
        repeatedWarning
      });
      metadata.textContent = hierarchy.metadata ? safeStringify(hierarchy.metadata) : 'No metadata returned.';
      diagnostics.textContent = hierarchy.diagnostics ? safeStringify(hierarchy.diagnostics) : 'No diagnostics reported.';
      details.hidden = serialized.length <= INLINE_PREVIEW_LIMIT;
      details.open = false;
      return {
        ...hierarchy,
        outcomeClass: runtimeReasoning.outcomeClass,
        evidenceCompleteness,
        explanationReasons: runtimeReasoning.reasons,
        runtimeReasoning
      };
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
