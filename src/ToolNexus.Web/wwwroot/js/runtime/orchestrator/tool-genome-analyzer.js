function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function detectEditorCount(root) {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return 0;
  }

  const editors = root.querySelectorAll([
    'textarea',
    'input[type="text"]',
    'input[type="search"]',
    'input[type="email"]',
    'input[type="url"]',
    '[contenteditable="true"]',
    '.monaco-editor'
  ].join(','));

  return editors.length;
}

function detectActionDensity(root, editorCount = 0) {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return {
      actionCount: 0,
      actionDensity: 0,
      densityBand: 'low'
    };
  }

  const actions = root.querySelectorAll('[data-action], [data-tool-action], button, [role="button"]');
  const actionCount = actions.length;
  const densityBase = Math.max(editorCount, 1);
  const actionDensity = Number((actionCount / densityBase).toFixed(2));

  let densityBand = 'low';
  if (actionDensity >= 2.5) {
    densityBand = 'high';
  } else if (actionDensity >= 1.25) {
    densityBand = 'medium';
  }

  return {
    actionCount,
    actionDensity,
    densityBand
  };
}

function detectWorkflowType({ editorCount = 0, actionCount = 0, densityBand = 'low' } = {}) {
  if (editorCount >= 3 || actionCount >= 7) {
    return 'pipeline';
  }

  if (editorCount >= 2 || densityBand === 'high') {
    return 'transform';
  }

  return 'single-step';
}

export function analyzeToolGenome(root, options = {}) {
  const editorCount = detectEditorCount(root);
  const density = detectActionDensity(root, editorCount);
  const workflowType = detectWorkflowType({
    editorCount,
    actionCount: density.actionCount,
    densityBand: density.densityBand
  });

  const profile = {
    editorCount,
    actionCount: density.actionCount,
    actionDensity: density.actionDensity,
    actionDensityBand: density.densityBand,
    workflowType,
    genome: `${workflowType}:${density.densityBand}:e${editorCount}:a${density.actionCount}`,
    estimatedPayloadSize: toNumber(options.estimatedPayloadSize, 0)
  };

  return profile;
}
