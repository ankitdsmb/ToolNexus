export const EXECUTION_UI_IMMUNITY = Object.freeze({
  score: Object.freeze({
    base: 100,
    deductionsBySeverity: Object.freeze({
      critical: 8,
      high: 5,
      medium: 2
    })
  }),
  severityByRule: Object.freeze({
    RULE_1: 'critical',
    RULE_2: 'critical',
    RULE_3: 'medium',
    RULE_4: 'high',
    RULE_5: 'medium',
    RULE_6: 'critical',
    RULE_7: 'critical',
    RULE_8: 'medium',
    RULE_9: 'high',
    RULE_10: 'critical'
  }),
  shellAnchors: Object.freeze([
    'data-tool-shell',
    'data-tool-context',
    'data-tool-status',
    'data-tool-followup',
    'data-tool-input',
    'data-tool-output',
    'data-tool-content-host'
  ]),
  shellSelectors: Object.freeze([
    '.tool-shell-page',
    '[data-tool-shell]',
    '[data-tool-context]',
    '[data-tool-status]',
    '[data-tool-followup]',
    '[data-tool-input]',
    '[data-tool-output]',
    '[data-tool-content-host]'
  ]),
  shellLayoutProperties: Object.freeze([
    'display:grid',
    'display: grid',
    'grid-template-columns',
    'grid-template-areas',
    'grid-template-rows',
    'place-items',
    'place-content'
  ])
});

export function severityForRule(ruleId) {
  return EXECUTION_UI_IMMUNITY.severityByRule[ruleId] ?? 'medium';
}

export function scoreFromViolations(violations = []) {
  const deductions = violations.reduce((sum, violation) => {
    const severity = violation?.severity ?? 'medium';
    return sum + (EXECUTION_UI_IMMUNITY.score.deductionsBySeverity[severity] ?? EXECUTION_UI_IMMUNITY.score.deductionsBySeverity.medium);
  }, 0);

  return Math.max(0, EXECUTION_UI_IMMUNITY.score.base - deductions);
}
