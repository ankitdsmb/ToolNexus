const DENSITY_CLASSES = Object.freeze([
  'density-autobalanced',
  'density-tight',
  'density-balanced',
  'density-relaxed',
  'toolbar-compressed',
  'editor-balance-active'
]);

function toFinite(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function widthOf(element) {
  if (!element) {
    return 0;
  }

  const rectWidth = toFinite(element.getBoundingClientRect?.().width, 0);
  if (rectWidth > 0) {
    return rectWidth;
  }

  const styleWidth = toFinite(globalThis.getComputedStyle?.(element)?.width?.replace?.('px', ''), 0);
  if (styleWidth > 0) {
    return styleWidth;
  }

  return toFinite(element.style?.width?.replace?.('px', ''), 0);
}

function heightOf(element) {
  if (!element) {
    return 0;
  }

  const rectHeight = toFinite(element.getBoundingClientRect?.().height, 0);
  if (rectHeight > 0) {
    return rectHeight;
  }

  const styleHeight = toFinite(globalThis.getComputedStyle?.(element)?.height?.replace?.('px', ''), 0);
  if (styleHeight > 0) {
    return styleHeight;
  }

  return toFinite(element.style?.height?.replace?.('px', ''), 0);
}

function getToolbarMetrics(widget) {
  const toolbar = widget.querySelector('.tool-local-actions, [data-tool-toolbar], [data-runtime-toolbar]');
  const toolbarButtons = Array.from(toolbar?.querySelectorAll('button, [role="button"], .tool-btn, [data-action]') ?? []);
  const toolbarWidth = widthOf(toolbar);
  const occupiedWidth = toolbarButtons.reduce((total, node) => total + widthOf(node), 0);
  const widthUsage = toolbarWidth > 0 ? Math.min(1, occupiedWidth / toolbarWidth) : 0;

  return {
    toolbar,
    toolbarButtonCount: toolbarButtons.length,
    toolbarWidthUsage: widthUsage
  };
}

function getEditorPanelCount(widget) {
  const editors = widget.querySelectorAll('[data-editor-surface], .tool-editor-panel, .monaco-editor, textarea, [contenteditable="true"]');
  return editors.length;
}

function getPanelCount(widget) {
  return widget.querySelectorAll('[data-panel], .tool-panel, .workspace-panel, .split-panel').length;
}

function hasPipelineWidget(widget) {
  return Boolean(widget.querySelector('[data-workflow="pipeline"], .tool-pipeline, .pipeline-workspace, .pipeline-step-list'));
}

function determineDensityProfile(metrics) {
  const isPipeline = metrics.pipelineDetected;
  const isMultiPanel = metrics.panelCount >= 3 || metrics.editorPanelCount >= 3;
  const isDualEditorWorkspace = metrics.editorPanelCount === 2;

  if (isPipeline || isMultiPanel) {
    return 'density-relaxed';
  }

  if (isDualEditorWorkspace) {
    return 'density-balanced';
  }

  return 'density-tight';
}

function applyDensityClasses(widget, profile, options = {}) {
  DENSITY_CLASSES.forEach((name) => widget.classList.remove(name));
  widget.classList.add('density-autobalanced', profile);

  if (options.toolbarCompressed) {
    widget.classList.add('toolbar-compressed');
  }

  if (options.editorBalanceActive) {
    widget.classList.add('editor-balance-active');
  }
}

export function applyExecutionDensityAutobalancer(root, options = {}) {
  const shell = root?.matches?.('[data-tool-shell]') ? root : root?.querySelector?.('[data-tool-shell]');
  const widget = shell?.querySelector?.('.tool-runtime-widget');

  if (!widget || !shell.contains(widget)) {
    return {
      applied: false,
      reason: 'runtime_widget_missing',
      profile: null,
      metrics: null,
      classes: []
    };
  }

  const toolbarMetrics = getToolbarMetrics(widget);
  const editorPanelCount = getEditorPanelCount(widget);
  const panelCount = getPanelCount(widget);
  const widgetHeight = heightOf(widget);
  const shellHeight = Math.max(heightOf(shell), 1);
  const verticalScrollPressure = widget.scrollHeight > 0
    ? widget.scrollHeight / Math.max(widget.clientHeight, 1)
    : 1;

  const metrics = {
    toolbarButtonCount: toolbarMetrics.toolbarButtonCount,
    toolbarWidthUsage: toolbarMetrics.toolbarWidthUsage,
    editorPanelCount,
    panelCount,
    verticalScrollPressure,
    widgetHeightRatio: widgetHeight / shellHeight,
    pipelineDetected: hasPipelineWidget(widget)
  };

  const profile = determineDensityProfile(metrics);
  const toolbarCompressed = metrics.toolbarButtonCount >= 6 || metrics.toolbarWidthUsage >= 0.9;
  const editorBalanceActive = profile === 'density-balanced' && metrics.editorPanelCount === 2;

  applyDensityClasses(widget, profile, {
    toolbarCompressed,
    editorBalanceActive
  });

  const classes = [
    'density-autobalanced',
    profile,
    ...(toolbarCompressed ? ['toolbar-compressed'] : []),
    ...(editorBalanceActive ? ['editor-balance-active'] : [])
  ];

  if (typeof options.emitTelemetry === 'function') {
    try {
      options.emitTelemetry('runtime_density_autobalanced', {
        toolSlug: options.toolSlug ?? null,
        profile,
        toolbarCompressed,
        editorBalanceActive,
        classes,
        metrics
      });
    } catch {
      // telemetry is best-effort by contract
    }
  }

  return {
    applied: true,
    profile,
    toolbarCompressed,
    editorBalanceActive,
    metrics,
    classes,
    widget
  };
}
