const MODE = Object.freeze({
  COMPACT: 'compact',
  BALANCED: 'balanced',
  EXPANDED: 'expanded',
  FOCUS: 'focus'
});

export function resolveExecutionMode(profile, options = {}) {
  const focusPayloadThreshold = Number(options.focusPayloadThreshold ?? 12000);
  const compactComplexityThreshold = Number(options.compactComplexityThreshold ?? 4);
  const expandedComplexityThreshold = Number(options.expandedComplexityThreshold ?? 12);

  const safeProfile = profile && typeof profile === 'object' ? profile : {};
  const complexityScore = Number(safeProfile.complexityScore ?? 0);
  const editorCount = Number(safeProfile.editorCount ?? 0);
  const widgetType = String(safeProfile.widgetType ?? 'simple');
  const estimatedPayloadSize = Number(safeProfile.estimatedPayloadSize ?? 0);
  const isEditingIntensive = safeProfile.isEditingIntensive === true;

  if (estimatedPayloadSize >= focusPayloadThreshold || isEditingIntensive) {
    return MODE.FOCUS;
  }

  if (complexityScore <= compactComplexityThreshold && widgetType === 'simple') {
    return MODE.COMPACT;
  }

  if (complexityScore >= expandedComplexityThreshold || widgetType === 'workflow' || editorCount >= 4) {
    return MODE.EXPANDED;
  }

  return MODE.BALANCED;
}

export const EXECUTION_MODES = MODE;
