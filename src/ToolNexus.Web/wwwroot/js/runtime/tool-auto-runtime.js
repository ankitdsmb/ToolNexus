// ARCHITECTURE LOCKED
// DO NOT MODIFY WITHOUT COUNCIL APPROVAL

import { buildAdaptiveGuidance, buildObservationTonePrefix, buildRuntimeReasoning, createRuntimeObservationState, createUnifiedToolControl, generateRuntimeOptimizationInsight, observeRuntimeReasoning, observeRuntimeStabilitySignals, validateRuntimeStability } from './tool-unified-control-runtime.js';
import { createToolContextAnalyzer } from './tool-context-analyzer.js';

const DEFAULT_EXECUTION_PATH_PREFIX = '/api/v1/tools';
const FORBIDDEN_EXECUTION_FIELDS = new Set([
  'executionAuthority',
  'authority',
  'runtimeAdapter',
  'adapter',
  'capabilityClass',
  'conformanceBypass',
  'bypassConformance',
  'policyDecision',
  'policyOverride'
]);
const FORBIDDEN_EXECUTION_FIELD_PREFIXES = ['execution', 'authority', 'runtime', 'capability', 'conformance', 'policy'];

function toBoundaryComparableKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function isForbiddenExecutionField(fieldName) {
  const comparable = toBoundaryComparableKey(fieldName);
  if (!comparable) {
    return false;
  }

  for (const forbiddenField of FORBIDDEN_EXECUTION_FIELDS) {
    if (comparable === toBoundaryComparableKey(forbiddenField)) {
      return true;
    }
  }

  return FORBIDDEN_EXECUTION_FIELD_PREFIXES.some((prefix) => comparable.startsWith(prefix));
}

function sanitizeExecutionPayload(payload = {}) {
  const sanitized = {};
  const ignoredFields = [];

  for (const [key, value] of Object.entries(payload)) {
    if (isForbiddenExecutionField(key)) {
      ignoredFields.push(key);
      continue;
    }

    sanitized[key] = value;
  }

  return { sanitized, ignoredFields };
}

function shouldWarnExecutionBoundary(manifest) {
  if (manifest?.runtimeIsDevelopment) {
    return true;
  }

  const environment = (globalThis.window?.ToolNexusConfig?.environment ?? '').toString().trim().toLowerCase();
  return environment === 'development';
}

function normalizePathPrefix(pathPrefix) {
  const normalized = (pathPrefix ?? '').toString().trim();
  if (!normalized) {
    return DEFAULT_EXECUTION_PATH_PREFIX;
  }

  return `/${normalized.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

function escapeLabel(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeStringify(payload) {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return 'Unable to serialize JSON response.';
  }
}

function defaultSchemaFromManifest(manifest) {
  const schema = manifest?.operationSchema ?? globalThis.window?.ToolNexusConfig?.tool?.operationSchema;
  if (schema && typeof schema === 'object') {
    return schema;
  }

  return null;
}

function flattenFields(schema) {
  const properties = schema?.properties && typeof schema.properties === 'object' ? schema.properties : null;
  if (!properties) {
    return [];
  }

  const required = Array.isArray(schema.required) ? new Set(schema.required) : new Set();
  const fields = [];
  for (const [name, definition] of Object.entries(properties)) {
    const field = definition && typeof definition === 'object' ? definition : {};
    fields.push({
      name,
      title: field.title ?? name,
      description: field.description ?? '',
      type: field.format === 'textarea' ? 'textarea' : field.type ?? 'text',
      defaultValue: field.default,
      required: required.has(name),
      group: field.group ?? field['x-group'] ?? 'General',
      hint: field.hint ?? field['x-hint'] ?? ''
    });
  }

  return fields;
}

function buildInputControl(doc, field) {
  const row = doc.createElement('div');
  row.className = 'tool-auto-runtime__field';
  row.dataset.field = field.name;

  const label = doc.createElement('label');
  label.htmlFor = `tool-auto-${field.name}`;
  label.textContent = field.required ? `${field.title} *` : field.title;

  let input;
  switch (field.type) {
    case 'number':
      input = doc.createElement('input');
      input.type = 'number';
      input.value = field.defaultValue ?? '';
      break;
    case 'boolean':
      input = doc.createElement('input');
      input.type = 'checkbox';
      input.checked = Boolean(field.defaultValue);
      break;
    case 'textarea':
      input = doc.createElement('textarea');
      input.rows = 8;
      input.value = field.defaultValue ?? '';
      break;
    case 'json':
      input = doc.createElement('textarea');
      input.rows = 10;
      input.value = typeof field.defaultValue === 'string' ? field.defaultValue : safeStringify(field.defaultValue ?? {});
      input.placeholder = '{\n  "key": "value"\n}';
      break;
    case 'text':
    default:
      input = doc.createElement('input');
      input.type = 'text';
      input.value = field.defaultValue ?? '';
      break;
  }

  input.id = `tool-auto-${field.name}`;
  input.dataset.field = field.name;
  input.dataset.fieldType = field.type;

  row.append(label, input);

  if (field.description || field.hint) {
    const hint = doc.createElement('p');
    hint.className = 'tool-auto-runtime__hint';
    hint.textContent = [field.description, field.hint].filter(Boolean).join(' · ');
    row.append(hint);
  }

  return { row, input };
}



function getRuntimeApi() {
  return globalThis.window?.ToolNexus?.runtime ?? null;
}

function emitSuggestionTelemetry(runtimeContext, eventName, { slug, suggestion } = {}) {
  const payload = {
    toolSlug: slug,
    metadata: {
      suggestedToolId: suggestion?.toolId ?? null,
      contextType: suggestion?.contextType ?? null,
      confidence: suggestion?.confidence ?? null
    }
  };

  try {
    runtimeContext?.adapters?.emitTelemetry?.(eventName, payload);
  } catch {
    // telemetry is best-effort
  }
}

function attachPredictiveSuggestion({ controls, unifiedControl, runtimeContext, slug }) {
  const analyzableControl = controls.find(({ input }) => {
    if (!input) {
      return false;
    }

    return input.tagName === 'TEXTAREA' || input.type === 'text' || input.dataset.fieldType === 'json';
  });

  if (!analyzableControl) {
    return;
  }

  const analyzer = createToolContextAnalyzer();
  const runtimeApi = getRuntimeApi();
  let activeSuggestion = null;

  const renderSuggestion = (suggestions = []) => {
    const nextSuggestion = suggestions[0] ?? null;

    if (!nextSuggestion) {
      if (activeSuggestion) {
        emitSuggestionTelemetry(runtimeContext, 'suggestion_dismissed', { slug, suggestion: activeSuggestion });
      }

      activeSuggestion = null;
      unifiedControl.hideSuggestion();
      return;
    }

    const changed = !activeSuggestion
      || activeSuggestion.toolId !== nextSuggestion.toolId
      || activeSuggestion.contextType !== nextSuggestion.contextType;

    activeSuggestion = nextSuggestion;
    unifiedControl.showSuggestion(activeSuggestion);

    if (changed) {
      emitSuggestionTelemetry(runtimeContext, 'suggestion_shown', { slug, suggestion: activeSuggestion });
    }
  };

  const onInput = () => {
    analyzer.run(analyzableControl.input.value, renderSuggestion);
  };

  const onAccept = async () => {
    if (!activeSuggestion || !runtimeApi?.invokeTool) {
      return;
    }

    emitSuggestionTelemetry(runtimeContext, 'suggestion_accepted', { slug, suggestion: activeSuggestion });

    await runtimeApi.invokeTool(activeSuggestion.toolId, {
      mountMode: 'inline',
      initialInput: analyzableControl.input.value,
      contextMetadata: {
        contextType: activeSuggestion.contextType,
        confidence: activeSuggestion.confidence,
        sourceTool: slug
      }
    });
  };

  unifiedControl.suggestionBadge.addEventListener('click', onAccept);
  analyzableControl.input.addEventListener('input', onInput);
  onInput();

  runtimeContext.addCleanup?.(() => {
    analyzer.dispose();
    unifiedControl.suggestionBadge.removeEventListener('click', onAccept);
    analyzableControl.input.removeEventListener('input', onInput);
  });
}

function createExecutionError(doc, message) {
  const panel = doc.createElement('div');
  panel.className = 'tool-auto-runtime__error';
  panel.setAttribute('role', 'alert');
  panel.textContent = message;
  return panel;
}

function extractAction() {
  const tool = globalThis.window?.ToolNexusConfig?.tool ?? {};
  return tool.clientSafeActions?.[0] ?? tool.actions?.[0] ?? 'execute';
}

async function executeTool({ slug, payload }) {
  const apiBase = (window.ToolNexusConfig?.apiBaseUrl ?? '').trim().replace(/\/$/, '');
  const pathPrefix = normalizePathPrefix(window.ToolNexusConfig?.toolExecutionPathPrefix);
  const action = extractAction();
  const endpointPath = `${pathPrefix}/${encodeURIComponent(slug)}/${encodeURIComponent(action)}`;
  const endpoint = apiBase ? `${apiBase}${endpointPath}` : endpointPath;

  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: JSON.stringify(payload) })
  });

  let responsePayload = null;
  try {
    responsePayload = await response.json();
  } catch {
    throw new Error(`Execution failed (${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(responsePayload?.error ?? responsePayload?.detail ?? 'Execution failed.');
  }

  return responsePayload;
}

function readFieldValue(input) {
  const type = input.dataset.fieldType ?? 'text';

  if (type === 'boolean') {
    return Boolean(input.checked);
  }

  if (type === 'number') {
    if (!input.value.trim()) {
      return null;
    }

    return Number(input.value);
  }

  if (type === 'json') {
    if (!input.value.trim()) {
      return null;
    }

    return JSON.parse(input.value);
  }

  return input.value;
}

function buildFieldGroups(doc, fields) {
  const byGroup = new Map();
  for (const field of fields) {
    const list = byGroup.get(field.group) ?? [];
    list.push(field);
    byGroup.set(field.group, list);
  }

  const groups = [];
  for (const [groupName, groupFields] of byGroup.entries()) {
    const section = doc.createElement('section');
    section.className = 'tool-auto-runtime__group';
    section.innerHTML = `<h3>${escapeLabel(groupName)}</h3>`;
    groups.push({ section, fields: groupFields });
  }

  return groups;
}



function createEmptyStateHint(doc, controls = []) {
  const container = doc.createElement('section');
  container.className = 'tool-auto-runtime__empty-state';
  container.innerHTML = '<p class="tool-auto-runtime__empty-title">Start with a quick input</p><p class="tool-auto-runtime__empty-copy">Paste data or load the built-in example, then run with Ctrl+Enter.</p>';

  const sample = String(globalThis.window?.ToolNexusConfig?.tool?.exampleInput ?? '').trim();
  if (sample) {
    const exampleButton = doc.createElement('button');
    exampleButton.type = 'button';
    exampleButton.className = 'tool-btn tool-btn--ghost tool-auto-runtime__example-btn';
    exampleButton.textContent = 'Use example';
    exampleButton.addEventListener('click', () => {
      const primary = controls.find(({ input }) => input?.tagName === 'TEXTAREA' || input?.dataset.fieldType === 'json' || input?.type === 'text')?.input;
      if (primary) {
        primary.value = sample;
        primary.dispatchEvent(new Event('input', { bubbles: true }));
      }
      syncVisibility();
    });
    container.append(exampleButton);
  }

  const hasInput = () => controls.some(({ input }) => {
    if (!input) return false;
    if (input.type === 'checkbox') return input.checked;
    return Boolean(String(input.value ?? '').trim());
  });

  const syncVisibility = () => {
    container.hidden = hasInput();
  };

  controls.forEach(({ input }) => {
    input?.addEventListener('input', syncVisibility);
    input?.addEventListener('change', syncVisibility);
  });

  syncVisibility();
  return container;
}

function renderFallbackWarningBadge(doc, unifiedControl) {
  const badge = doc.createElement('p');
  badge.className = 'tool-auto-runtime__resolution-warning';
  badge.textContent = 'Auto runtime loaded due to custom runtime failure';
  unifiedControl.shell.append(badge);
}

function resolveAutoRuntimeToolRoot(root) {
  const toolRoot = root?.querySelector?.('[data-tool-shell]')
    ?? root?.querySelector?.('[data-tool-root]')
    ?? root;

  const canonicalHost = root?.querySelector?.('[data-tool-shell]')
    ?? (root?.matches?.('[data-tool-shell]') ? root : null);

  if (canonicalHost && toolRoot !== canonicalHost && toolRoot?.closest?.('[data-tool-shell]') !== canonicalHost) {
    throw new Error('AUTO_RUNTIME_CONTRACT_VIOLATION');
  }

  return toolRoot;
}

function renderTierError(root, tier, uiMode) {
  const toolRoot = resolveAutoRuntimeToolRoot(root);
  if (!toolRoot) {
    return;
  }

  const panel = document.createElement('section');
  panel.className = 'tool-auto-runtime tool-auto-runtime--error';
  panel.append(createExecutionError(document, `Tool UI configuration error: complexity tier ${tier} requires custom UI, but uiMode is "${uiMode}".`));

  const outputZone = toolRoot.querySelector('[data-tool-output]');
  const statusZone = toolRoot.querySelector('[data-tool-status]');

  if (statusZone) {
    statusZone.textContent = 'Runtime configuration error';
  }

  if (outputZone) {
    if (outputZone === toolRoot) {
      throw new Error('AUTO_RUNTIME_CONTRACT_VIOLATION');
    }
    outputZone.replaceChildren(panel);
    return;
  }

  toolRoot.append(panel);
}

export function createAutoToolRuntimeModule({ manifest, slug }) {
  const complexityTier = Number(manifest?.complexityTier ?? 1);
  const uiMode = String(manifest?.uiMode ?? 'auto').trim().toLowerCase() || 'auto';

  return {
    toolRuntimeType: 'mount',
    useAutoInputs(root, runtimeContext = {}) {
      const doc = root?.ownerDocument ?? document;
      const toolRoot = resolveAutoRuntimeToolRoot(root);
      if (!toolRoot) {
        return null;
      }

      const schema = defaultSchemaFromManifest(manifest);
      const fields = flattenFields(schema);
      const unifiedControl = createUnifiedToolControl({
        root: toolRoot,
        doc,
        slug,
        manifest,
        subtitle: 'Auto-generated from runtime schema'
      });
      unifiedControl.shell.dataset.uiMode = uiMode;
      unifiedControl.shell.dataset.complexityTier = String(complexityTier);

      if (manifest?.runtimeResolutionMode === 'auto_fallback' && manifest?.runtimeIsDevelopment) {
        renderFallbackWarningBadge(doc, unifiedControl);
      }

      const controls = [];
      if (!fields.length) {
        const fallback = {
          name: 'payload',
          title: 'JSON payload',
          type: 'json',
          required: false,
          description: 'Schema unavailable. Provide raw JSON payload.',
          group: 'General',
          hint: ''
        };
        const control = buildInputControl(doc, fallback);
        unifiedControl.inputArea.append(control.row);
        controls.push({ field: fallback, input: control.input });
      } else if (complexityTier >= 2) {
        for (const group of buildFieldGroups(doc, fields)) {
          for (const field of group.fields) {
            const control = buildInputControl(doc, field);
            group.section.append(control.row);
            controls.push({ field, input: control.input });
          }
          unifiedControl.inputArea.append(group.section);
        }
      } else {
        for (const field of fields) {
          const control = buildInputControl(doc, field);
          unifiedControl.inputArea.append(control.row);
          controls.push({ field, input: control.input });
        }
      }

      const emptyStateHint = createEmptyStateHint(doc, controls);
      unifiedControl.inputArea.prepend(emptyStateHint);

      const runButton = unifiedControl.runButton;

      const runtimeObservation = createRuntimeObservationState();

      const run = async () => {
        emptyStateHint.hidden = true;
        unifiedControl.clearErrors();
        unifiedControl.setIntent('AI intent: Validate request shape before runtime execution.');
        unifiedControl.setGuidance('Guidance: Ensure required fields are complete.');
        unifiedControl.setStatus('validating');

        const payload = {};
        try {
          for (const { field, input } of controls) {
            const value = readFieldValue(input);
            if (field.required && (value === null || value === '')) {
              throw new Error(`Field "${field.title}" is required.`);
            }

            if (value !== null && value !== '') {
              payload[field.name] = value;
            }
          }
        } catch (error) {
          unifiedControl.setStatus('warning', 'Warning · Input validation needs attention');
          unifiedControl.setIntent('AI intent: Stop execution until request validity is restored.');
          unifiedControl.setGuidance('Guidance: Correct highlighted input issues and rerun.');
          unifiedControl.showError(error?.message ?? 'Invalid input.');
          return;
        }

        const { sanitized, ignoredFields } = sanitizeExecutionPayload(payload);
        if (ignoredFields.length > 0 && shouldWarnExecutionBoundary(manifest)) {
          console.warn('[ExecutionBoundary] Ignored client-owned execution fields.', {
            slug,
            ignoredFields
          });
        }

        runButton.disabled = true;
        unifiedControl.setIntent('AI intent: Execute request through authority resolution and runtime processing.');
        unifiedControl.setGuidance('Guidance: Runtime is active; wait for evidence and interpretation.');
        unifiedControl.setStatus('running');

        try {
          runtimeContext?.adapters?.emitTelemetry?.('runtime_execution_boundary_checked', {
            toolSlug: slug,
            runtime: {
              executionBoundaryRespected: true
            },
            metadata: {
              ignoredFields
            }
          });
        } catch {
          // telemetry is best-effort
        }

        try {
          const result = await executeTool({ slug, payload: sanitized });
          unifiedControl.setStatus('streaming');
          unifiedControl.setIntent('AI intent: Assemble output evidence and interpretation for your request.');
          unifiedControl.setGuidance('Guidance: Review interpretation summary and confidence before follow-up actions.');
          const runtimeWarningCount = ignoredFields.length;
          const enforcedOutcomeClass = runtimeWarningCount > 0 ? 'warning_partial' : undefined;
          const runtimeReasons = runtimeWarningCount > 0
            ? ['client-owned execution fields were ignored at execution boundary']
            : [];
          const repeatedWarningHint = runtimeObservation._lastOutcomeClass === 'warning_partial'
            && enforcedOutcomeClass === 'warning_partial';
          const hierarchy = unifiedControl.renderResult(result, {
            repeatedWarning: repeatedWarningHint,
            forcedOutcomeClass: enforcedOutcomeClass,
            additionalReasons: runtimeReasons,
            runtimeObservation
          });
          if (shouldWarnExecutionBoundary(manifest) && hierarchy?.stability?.instabilityDetected) {
            console.warn('[RuntimeStability] Runtime reasoning instability detected and normalized.', {
              slug,
              warnings: hierarchy.stability.warnings
            });
          }
          const validatedReasoning = validateRuntimeStability(
            hierarchy?.runtimeReasoning ?? buildRuntimeReasoning({
              outcomeClass: enforcedOutcomeClass ?? hierarchy?.outcomeClass ?? 'uncertain_result',
              repeatedWarning: repeatedWarningHint,
              additionalReasons: runtimeReasons
            }),
            runtimeObservation
          );
          if (shouldWarnExecutionBoundary(manifest) && validatedReasoning.instabilityDetected) {
            console.warn('[RuntimeStability] Runtime reasoning instability detected and normalized.', {
              slug,
              warnings: validatedReasoning.warnings
            });
          }
          const runtimeReasoning = validatedReasoning.runtimeReasoning;
          const observationPatterns = observeRuntimeReasoning(runtimeObservation, runtimeReasoning);
          const stabilitySignals = observeRuntimeStabilitySignals(runtimeObservation, validatedReasoning);
          const optimizationInsight = generateRuntimeOptimizationInsight({
            runtimeReasoning,
            observationPatterns,
            stabilitySignals,
            observation: runtimeObservation
          });
          const outcomeClass = runtimeReasoning.outcomeClass;
          const adaptive = buildAdaptiveGuidance({
            outcomeClass,
            repeatedWarning: observationPatterns.repeatedWarningSequence
          });

          if (outcomeClass === 'warning_partial') {
            unifiedControl.setStatus('warning', 'Warning · Completed with runtime notes');
          } else if (outcomeClass === 'uncertain_result') {
            unifiedControl.setStatus('uncertain');
          } else {
            unifiedControl.setStatus('success');
          }

          const tonePrefix = buildObservationTonePrefix(observationPatterns);
          const guidanceLine = `${runtimeReasoning.guidance.join(' ')}`;
          unifiedControl.setIntent(adaptive.intent);
          unifiedControl.setGuidance(tonePrefix ? `Guidance: ${tonePrefix} ${guidanceLine}` : `Guidance: ${guidanceLine}`);
          if (optimizationInsight.repeatedPatternDetected) {
            unifiedControl.setNextAction(`Optimization insight: ${optimizationInsight.optimizationHint}`);
          }
        } catch (error) {
          observeRuntimeReasoning(runtimeObservation, {
            outcomeClass: 'failed',
            reasons: ['execution error path was triggered']
          });
          unifiedControl.setStatus('failed');
          unifiedControl.setIntent('AI intent: Report failed execution path with recoverable guidance.');
          const failedReasoning = buildRuntimeReasoning({
            outcomeClass: 'failed',
            explanationReasons: ['execution error path was triggered']
          });
          const stableFailedReasoning = validateRuntimeStability(failedReasoning, runtimeObservation);
          if (shouldWarnExecutionBoundary(manifest) && stableFailedReasoning.instabilityDetected) {
            console.warn('[RuntimeStability] Runtime reasoning instability detected and normalized.', {
              slug,
              warnings: stableFailedReasoning.warnings
            });
          }
          unifiedControl.setClassificationWhy(`Why this result is classified this way: ${stableFailedReasoning.runtimeReasoning.reasons.join('; ')}.`);
          unifiedControl.setGuidance(`Guidance: ${stableFailedReasoning.runtimeReasoning.guidance.join(' ')}`);
          unifiedControl.showError(error?.message ?? 'Execution failed.');
        } finally {
          runButton.disabled = false;
        }
      };

      const handleShortcutRun = (event) => {
        const isShortcut = (event.ctrlKey || event.metaKey) && event.key === 'Enter';
        if (!isShortcut || runButton.disabled) {
          return;
        }

        event.preventDefault();
        run();
      };

      runButton.addEventListener('click', run);
      unifiedControl.shell.addEventListener('keydown', handleShortcutRun);
      runtimeContext.addCleanup?.(() => {
        runButton.removeEventListener('click', run);
        unifiedControl.shell.removeEventListener('keydown', handleShortcutRun);
      });

      attachPredictiveSuggestion({ controls, unifiedControl, runtimeContext, slug });

      return { controls, runButton, output: unifiedControl.result, status: unifiedControl.status, suggestionBadge: unifiedControl.suggestionBadge };
    },
    create(root) {
      if (!root) {
        return null;
      }

      if (complexityTier >= 4 && uiMode === 'auto') {
        renderTierError(root, complexityTier, uiMode);
        return { root, blocked: true };
      }

      return { root, blocked: false };
    },
    init(instance, root, context) {
      const effectiveRoot = instance?.root ?? root;
      if (!effectiveRoot || instance?.blocked) {
        return instance;
      }

      this.useAutoInputs(effectiveRoot, context);
      return { ...instance, mounted: true };
    },
    destroy() {}
  };
}
