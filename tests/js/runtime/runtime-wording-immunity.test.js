import {
  buildAdaptiveGuidance,
  buildRuntimeReasoning
} from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-unified-control-runtime.js';

describe('runtime wording immunity', () => {
  test.each([
    ['usable_success', 'strong'],
    ['warning_partial', 'cautious'],
    ['uncertain_result', 'limited'],
    ['failed', 'none']
  ])('confidence wording remains deterministic for %s', (outcomeClass, expectedConfidence) => {
    const reasoning = buildRuntimeReasoning({
      outcomeClass,
      explanationReasons: ['deterministic regression probe']
    });

    expect(reasoning.confidenceLevel).toBe(expectedConfidence);
    expect(reasoning.guidance[0]).toContain('Because deterministic regression probe');
  });

  test('guidance references explanation reasons consistently across repeated runs', () => {
    const reasons = ['warnings detected in runtime evidence', 'diagnostics indicate partial risk exposure'];
    const baseline = buildRuntimeReasoning({
      outcomeClass: 'warning_partial',
      explanationReasons: reasons,
      repeatedWarning: true
    });

    for (let run = 0; run < 5; run += 1) {
      const current = buildRuntimeReasoning({
        outcomeClass: 'warning_partial',
        explanationReasons: reasons,
        repeatedWarning: true
      });

      expect(current.guidance[0]).toBe(baseline.guidance[0]);
      expect(current.reasons).toEqual(baseline.reasons);
      expect(current.confidenceLevel).toBe('cautious');
    }
  });

  test.each([
    ['warning_partial', 'cautionary evidence'],
    ['uncertain_result', 'interpretation uncertainty'],
    ['usable_success', 'usable for workflow continuation']
  ])('adaptive guidance intent text remains aligned for %s', (outcomeClass, expectedPhrase) => {
    const guidance = buildAdaptiveGuidance({ outcomeClass, repeatedWarning: false });

    expect(guidance.intent).toContain(expectedPhrase);
    expect(guidance.guidance.startsWith('Guidance:')).toBe(true);
  });
});
