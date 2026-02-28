import { describe, expect, test } from 'vitest';
import { buildAdaptiveGuidance, buildAdaptiveGuidanceFromReasons, buildObservationTonePrefix, buildRuntimeReasoning, createRuntimeObservationState, createUnifiedToolControl, generateRuntimeOptimizationInsight, observeRuntimeReasoning, observeRuntimeStabilitySignals, useUnifiedToolControl, validateRuntimeStability } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-unified-control-runtime.js';

function createContractHost() {
  const host = document.createElement('div');
  host.innerHTML = `
    <section data-tool-shell="true">
      <header data-tool-context="true"></header>
      <section data-tool-input="true"></section>
      <section data-tool-status="true"></section>
      <section data-tool-output="true"></section>
      <footer data-tool-followup="true"></footer>
    </section>`;
  return host;
}

describe('tool unified control runtime', () => {
  test('renders compact unified shell with icon fallback and expandable output', () => {
    const root = createContractHost();

    const control = createUnifiedToolControl({
      root,
      slug: 'json-formatter',
      manifest: { title: 'JSON Formatter' }
    });

    expect(root.querySelector('.tn-unified-tool-control')).not.toBeNull();
    expect(root.querySelector('.tn-unified-tool-control__icon').textContent).toBe('</>');

    control.renderResult({ ok: true, value: 'x'.repeat(800) });

    expect(control.preview.textContent.length).toBeLessThan(control.result.textContent.length);
    expect(control.details.hidden).toBe(false);
  });


  test('renders inside [data-tool-shell] without replacing canonical shell', () => {
    const host = document.createElement('div');
    host.innerHTML = `
      <section data-tool-shell="true">
        <header data-tool-context="true"></header>
        <section data-tool-input="true"><p data-sentinel>sentinel</p></section>
        <section data-tool-status="true"></section>
        <section data-tool-output="true"></section>
        <footer data-tool-followup="true"></footer>
      </section>`;
    const runtimeContainer = host.querySelector('[data-tool-shell]');

    const control = createUnifiedToolControl({
      root: host,
      slug: 'json-formatter',
      manifest: { title: 'JSON Formatter' }
    });

    expect(control).not.toBeNull();
    expect(host.querySelector('[data-tool-shell]')).toBe(runtimeContainer);
    expect(host.querySelector('[data-sentinel]')).toBeNull();
    expect(host.querySelector('[data-tool-shell].tn-unified-tool-control')).not.toBeNull();
  });


  test('classifies warning_partial and uncertain_result outcomes for adaptive runtime wording', () => {
    const root = createContractHost();
    const control = createUnifiedToolControl({
      root,
      slug: 'json-formatter',
      manifest: { title: 'JSON Formatter' }
    });

    const warningHierarchy = control.renderResult({
      output: { normalized: true },
      warnings: ['w1'],
      diagnostics: { traceId: 'abc' },
      metadata: { runId: '1' }
    });
    expect(warningHierarchy.outcomeClass).toBe('warning_partial');
    expect(root.textContent).toContain('Cautious');
    expect(root.textContent).toContain('Why this result is classified this way: warnings detected in runtime evidence; diagnostics indicate partial risk exposure.');

    const uncertainHierarchy = control.renderResult({
      output: { maybe: true },
      diagnostics: { note: 'missing context' }
    });
    expect(uncertainHierarchy.outcomeClass).toBe('uncertain_result');
    expect(root.textContent).toContain('Limited');
    expect(root.textContent).toContain('Why this result is classified this way: metadata or interpretation context is limited; diagnostics are more dominant than explanatory evidence.');
  });

  test('buildAdaptiveGuidance returns guidance variants by outcome class', () => {
    expect(buildAdaptiveGuidance({ outcomeClass: 'usable_success', repeatedWarning: false }).guidance).toContain('continue through follow-up actions');
    expect(buildAdaptiveGuidance({ outcomeClass: 'warning_partial', repeatedWarning: true }).guidance).toContain('recurring warning pattern');
    expect(buildAdaptiveGuidance({ outcomeClass: 'uncertain_result', repeatedWarning: false }).guidance).toContain('trusted reference');
  });

  test('buildAdaptiveGuidanceFromReasons binds operator guidance to explanation reasons', () => {
    expect(buildAdaptiveGuidanceFromReasons({
      outcomeClass: 'uncertain_result',
      explanationReasons: ['metadata is limited', 'diagnostics are dominant']
    })).toContain('Because metadata is limited and diagnostics are dominant');
  });


  test('buildRuntimeReasoning enforces consistency across outcome, confidence, reasons, and guidance', () => {
    const reasoning = buildRuntimeReasoning({
      outcomeClass: 'warning_partial',
      explanationReasons: ['warnings detected in runtime evidence']
    });

    expect(reasoning.outcomeClass).toBe('warning_partial');
    expect(reasoning.confidenceLevel).toBe('cautious');
    expect(reasoning.reasons).toContain('warnings detected in runtime evidence');
    expect(reasoning.guidance[0]).toContain('Because warnings detected in runtime evidence');
  });


  test('runtime observation state tracks repeated outcomes and reason patterns', () => {
    const observation = createRuntimeObservationState();

    const first = observeRuntimeReasoning(observation, {
      outcomeClass: 'warning_partial',
      reasons: ['warnings detected in runtime evidence']
    });

    const second = observeRuntimeReasoning(observation, {
      outcomeClass: 'warning_partial',
      reasons: ['warnings detected in runtime evidence']
    });

    expect(first.repeatedOutcomeClass).toBe(false);
    expect(second.repeatedOutcomeClass).toBe(true);
    expect(second.repeatedReasonSignals).toBe(true);
    expect(second.repeatedWarningSequence).toBe(true);
    expect(observation.repeatedOutcomeCount).toBe(2);
    expect(observation.repeatedReasonPatterns.length).toBe(1);
    expect(observation.lastGuidanceType).toBe('warning');
  });

  test('runtime observation tracks repeated guidance loops for optimization awareness', () => {
    const observation = createRuntimeObservationState();

    observeRuntimeReasoning(observation, {
      outcomeClass: 'warning_partial',
      reasons: ['warnings detected in runtime evidence']
    });
    const second = observeRuntimeReasoning(observation, {
      outcomeClass: 'warning_partial',
      reasons: ['warnings detected in runtime evidence']
    });

    expect(second.repeatedGuidanceLoop).toBe(true);
    expect(observation.repeatedGuidanceLoopCount).toBe(2);
  });

  test('runtime optimization insight suggests input refinement for repeated warning patterns', () => {
    const insight = generateRuntimeOptimizationInsight({
      runtimeReasoning: { outcomeClass: 'warning_partial' },
      observationPatterns: {
        repeatedWarningSequence: true,
        repeatedReasonSignals: true
      },
      stabilitySignals: {}
    });

    expect(insight.repeatedPatternDetected).toBe(true);
    expect(insight.optimizationHint).toContain('refine input constraints');
    expect(insight.confidence).toBe('high');
  });

  test('runtime optimization insight suggests richer context for recurring uncertainty', () => {
    const insight = generateRuntimeOptimizationInsight({
      runtimeReasoning: { outcomeClass: 'uncertain_result' },
      observationPatterns: {
        repeatedOutcomeClass: true,
        repeatedReasonSignals: true
      },
      stabilitySignals: {}
    });

    expect(insight.repeatedPatternDetected).toBe(true);
    expect(insight.optimizationHint).toContain('richer metadata/context');
    expect(insight.confidence).toBe('high');
  });

  test('runtime optimization insight suggests validation checks for repeated instability', () => {
    const observation = createRuntimeObservationState();
    const first = observeRuntimeStabilitySignals(observation, { instabilityDetected: true });
    const second = observeRuntimeStabilitySignals(observation, { instabilityDetected: true });

    expect(first.repeatedInstabilityDetected).toBe(false);
    expect(second.repeatedInstabilityDetected).toBe(true);

    const insight = generateRuntimeOptimizationInsight({
      runtimeReasoning: { outcomeClass: 'failed' },
      observationPatterns: {},
      stabilitySignals: second
    });

    expect(insight.repeatedPatternDetected).toBe(true);
    expect(insight.optimizationHint).toContain('validation checks');
    expect(insight.confidence).toBe('medium');
  });

  test('validateRuntimeStability preserves deterministic outcome class for repeated reason signals', () => {
    const observation = createRuntimeObservationState();

    const baseline = validateRuntimeStability({
      outcomeClass: 'warning_partial',
      confidenceLevel: 'cautious',
      reasons: ['warnings detected in runtime evidence'],
      guidance: ['Because warnings detected in runtime evidence, inspect warnings, adjust inputs, then rerun.']
    }, observation);

    const unstable = validateRuntimeStability({
      outcomeClass: 'usable_success',
      confidenceLevel: 'high',
      reasons: ['warnings detected in runtime evidence'],
      guidance: ['Proceed.']
    }, observation);

    expect(baseline.instabilityDetected).toBe(false);
    expect(unstable.instabilityDetected).toBe(true);
    expect(unstable.runtimeReasoning.outcomeClass).toBe('warning_partial');
    expect(unstable.runtimeReasoning.confidenceLevel).toBe('cautious');
    expect(unstable.runtimeReasoning.guidance[0]).toContain('Because warnings detected in runtime evidence');
  });

  test('observation cannot change severity or confidence mapping', () => {
    const observation = createRuntimeObservationState();
    const runtimeReasoning = buildRuntimeReasoning({
      outcomeClass: 'warning_partial',
      explanationReasons: ['warnings detected in runtime evidence']
    });

    const before = { ...runtimeReasoning };
    const patterns = observeRuntimeReasoning(observation, runtimeReasoning);

    expect(patterns.repeatedOutcomeClass).toBe(false);
    expect(runtimeReasoning.outcomeClass).toBe(before.outcomeClass);
    expect(runtimeReasoning.confidenceLevel).toBe(before.confidenceLevel);
  });

  test('observation tone prefix adapts wording without altering reasoning model', () => {
    expect(buildObservationTonePrefix({ repeatedWarningSequence: true })).toBe('Similar warnings detected in recent runs.');
    expect(buildObservationTonePrefix({ repeatedReasonSignals: true })).toBe('Reasoning signals are recurring across recent runs.');
    expect(buildObservationTonePrefix({ repeatedOutcomeClass: true })).toBe('Recent runs show a similar outcome trend.');
    expect(buildObservationTonePrefix({})).toBe('');

    const reasoning = buildRuntimeReasoning({
      outcomeClass: 'warning_partial',
      explanationReasons: ['warnings detected in runtime evidence']
    });

    expect(reasoning.outcomeClass).toBe('warning_partial');
    expect(reasoning.confidenceLevel).toBe('cautious');
  });

  test('adapter helper can consume runtime context object', () => {
    const root = createContractHost();
    const runtime = { root };

    const control = useUnifiedToolControl(runtime, {
      slug: 'api-tool',
      manifest: { icon: 'api', title: 'API Tool' }
    });

    expect(control).not.toBeNull();
    expect(root.textContent).toContain('API Tool');
    expect(root.querySelector('.tn-unified-tool-control__icon').textContent).toBe('API');
  });
});
