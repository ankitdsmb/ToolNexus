const MODE_CLASS_MAP = {
  simple: ['runtime-mode-simple', 'density-profile-compact'],
  workspace: ['runtime-mode-workspace', 'density-profile-balanced'],
  advanced: ['runtime-mode-pipeline', 'density-profile-expanded']
};

const RUNTIME_MODE_CLASSES = Object.values(MODE_CLASS_MAP).flat();

function resolveToolbarPriority(genomeProfile = {}) {
  if (genomeProfile.actionDensityBand === 'high' || genomeProfile.actionCount >= 5) {
    return 'workflow_first';
  }

  if (genomeProfile.actionDensityBand === 'medium') {
    return 'balanced';
  }

  return 'editor_first';
}

function resolveEditorBalanceMode(genomeProfile = {}) {
  if (genomeProfile.workflowType === 'pipeline') {
    return 'dual_focus';
  }

  if (genomeProfile.editorCount > 1) {
    return 'split_input_output';
  }

  return 'single_focus';
}

export function resolveAdaptiveRuntimeClasses(mode) {
  return MODE_CLASS_MAP[mode] ?? MODE_CLASS_MAP.workspace;
}

export function selectExecutionStrategy(genomeProfile = {}) {
  const mode = genomeProfile.mode ?? 'workspace';
  const spacingProfile = mode === 'simple'
    ? 'compact'
    : mode === 'advanced'
      ? 'expanded'
      : 'balanced';

  return {
    spacingProfile,
    toolbarPriority: resolveToolbarPriority(genomeProfile),
    editorBalanceMode: resolveEditorBalanceMode(genomeProfile)
  };
}

export function applyAdaptiveRuntimeClasses(root, mode) {
  const appliedRuntimeClasses = resolveAdaptiveRuntimeClasses(mode);

  if (root?.classList) {
    root.classList.remove(...RUNTIME_MODE_CLASSES);
    root.classList.add(...appliedRuntimeClasses);
  }

  return appliedRuntimeClasses;
}
