export function evaluateRuntimeGovernance({ genomeProfile = {}, behaviorProfile = {} } = {}) {
  const actionCount = Number(genomeProfile.actionCount ?? 0);
  const actionDensity = Number(genomeProfile.actionDensity ?? 0);
  const complexityScore = Number(behaviorProfile.complexityScore ?? 0);

  const actionOverload = actionCount >= 8;
  const densityRisk = actionDensity >= 2.75;
  const layoutRisk = complexityScore >= 6;

  const warnings = [];
  if (actionOverload) {
    warnings.push('action_overload');
  }
  if (densityRisk) {
    warnings.push('density_risk');
  }
  if (layoutRisk) {
    warnings.push('layout_risk');
  }

  return {
    actionOverload,
    densityRisk,
    layoutRisk,
    warnings,
    riskLevel: warnings.length >= 2 ? 'high' : warnings.length === 1 ? 'medium' : 'low'
  };
}
