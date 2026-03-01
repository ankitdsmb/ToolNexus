export function predictRuntimeBehavior(genomeProfile = {}) {
  const editorCount = Number(genomeProfile.editorCount ?? 0);
  const actionCount = Number(genomeProfile.actionCount ?? 0);
  const actionDensity = Number(genomeProfile.actionDensity ?? 0);
  const workflowType = genomeProfile.workflowType ?? 'single-step';

  const primaryInteraction = editorCount > actionCount ? 'editing' : (actionCount > editorCount ? 'action-driven' : 'balanced');

  const complexityScore = Number((
    (editorCount * 0.35)
    + (actionCount * 0.25)
    + (actionDensity * 0.2)
    + (workflowType === 'pipeline' ? 2 : workflowType === 'transform' ? 1 : 0)
  ).toFixed(2));

  let executionStyle = 'direct';
  if (workflowType === 'pipeline' || complexityScore >= 5) {
    executionStyle = 'iterative';
  } else if (workflowType === 'transform' || complexityScore >= 3) {
    executionStyle = 'guided';
  }

  return {
    primaryInteraction,
    complexityScore,
    executionStyle
  };
}
