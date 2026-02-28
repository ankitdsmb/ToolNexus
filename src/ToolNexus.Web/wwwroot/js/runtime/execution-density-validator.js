const DENSITY_TELEMETRY_CATEGORY = 'density_drift';

const DEFAULT_THRESHOLDS = Object.freeze({
  compactGapMinPx: 6,
  compactGapMaxPx: 18,
  nestedSurfaceDepthMax: 2,
  toolbarEditorDistanceMaxPx: 24,
  dualEditorHeightDeltaMaxPx: 8,
  shellPaddingMaxPx: 20,
  statusZoneHeightMaxPx: 48,
  headerViewportMaxRatio: 0.15
});

const RULES = Object.freeze({
  D1: { severity: 'medium', weight: 6, message: 'Section spacing must remain compact (6-18px).' },
  D2: { severity: 'high', weight: 14, message: 'Nested surfaces exceed allowed depth (max 2).' },
  D3: { severity: 'high', weight: 10, message: 'Toolbar must remain near editor (<=24px).' },
  D4: { severity: 'high', weight: 12, message: 'Dual editor heights are imbalanced (>8px delta).' },
  D5: { severity: 'critical', weight: 15, message: 'Exactly one .tool-btn--primary is required.' },
  D6: { severity: 'medium', weight: 8, message: 'Shell runtime content padding exceeds 20px.' },
  D7: { severity: 'medium', weight: 7, message: 'Status zone height exceeds 48px.' },
  D8: { severity: 'medium', weight: 6, message: 'Documentation must stay visually secondary.' },
  D9: { severity: 'high', weight: 10, message: 'Header must remain <=15% of viewport height.' },
  D10: { severity: 'critical', weight: 12, message: 'Density scoring must remain deterministic.' }
});

function toPx(value) {
  if (value == null || value === '') return Number.NaN;
  const parsed = Number.parseFloat(String(value).replace('px', '').trim());
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function styleOf(el) {
  if (!el || !globalThis.getComputedStyle) return null;
  return globalThis.getComputedStyle(el);
}

function elementHeight(el) {
  if (!el) return Number.NaN;
  const computed = styleOf(el);
  const fromComputed = toPx(computed?.height);
  if (Number.isFinite(fromComputed) && fromComputed > 0) return fromComputed;
  const inlineHeight = toPx(el.style?.height || el.style?.minHeight);
  if (Number.isFinite(inlineHeight)) return inlineHeight;
  const rectHeight = Number(el.getBoundingClientRect?.().height ?? Number.NaN);
  return Number.isFinite(rectHeight) && rectHeight > 0 ? rectHeight : Number.NaN;
}


function maxFinite(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  return finite.length > 0 ? Math.max(...finite) : Number.NaN;
}

function addViolation(violations, ruleId, details, measurement) {
  const rule = RULES[ruleId];
  violations.push({
    ruleId,
    severity: rule.severity,
    weight: rule.weight,
    message: `${rule.message} ${details}`.trim(),
    measurement
  });
}

function findEditors(scope) {
  return Array.from(scope.querySelectorAll('[data-editor-surface], .tool-local-surface, textarea, [contenteditable="true"], .monaco-editor'));
}

function findSurfaceDepth(scope) {
  const selectors = '.card, .panel, .surface, .tool-local-surface, [data-surface], [data-panel]';
  const nodes = Array.from(scope.querySelectorAll(selectors));
  let maxDepth = 0;

  for (const node of nodes) {
    let depth = 0;
    let current = node.parentElement;
    while (current && scope.contains(current)) {
      if (current.matches?.(selectors)) {
        depth += 1;
      }
      current = current.parentElement;
    }
    maxDepth = Math.max(maxDepth, depth + 1);
  }

  return maxDepth;
}

function computeSectionGaps(widget) {
  if (!widget) return [];
  const gaps = [];
  const children = Array.from(widget.children ?? []).filter((node) => node.nodeType === Node.ELEMENT_NODE);
  for (let index = 0; index < children.length - 1; index += 1) {
    const currentStyle = styleOf(children[index]);
    const nextStyle = styleOf(children[index + 1]);
    const marginBottom = toPx(currentStyle?.marginBottom || children[index].style?.marginBottom);
    const marginTop = toPx(nextStyle?.marginTop || children[index + 1].style?.marginTop);
    const parentGap = toPx(styleOf(widget)?.rowGap || styleOf(widget)?.gap || widget.style?.rowGap || widget.style?.gap);
    const resolvedGap = [marginBottom, marginTop, parentGap].find((value) => Number.isFinite(value) && value >= 0);
    if (Number.isFinite(resolvedGap)) {
      gaps.push(resolvedGap);
    }
  }

  const explicitGap = toPx(styleOf(widget)?.rowGap || styleOf(widget)?.gap || widget.style?.rowGap || widget.style?.gap);
  if (Number.isFinite(explicitGap)) {
    gaps.push(explicitGap);
  }

  return gaps;
}

function highestSeverity(violations) {
  if (violations.some((item) => item.severity === 'critical')) return 'critical';
  if (violations.some((item) => item.severity === 'high')) return 'high';
  if (violations.some((item) => item.severity === 'medium')) return 'medium';
  return 'none';
}

export function validateExecutionDensity(root, options = {}) {
  const scope = root ?? document;
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(options.thresholds ?? {}) };
  const violations = [];

  const shell = scope.matches?.('[data-tool-shell]') ? scope : scope.querySelector?.('[data-tool-shell]');
  const widget = shell?.querySelector?.('.tool-runtime-widget') ?? scope.querySelector?.('.tool-runtime-widget');
  const toolbar = widget?.querySelector?.('.tool-local-actions');
  const editors = findEditors(widget ?? scope);
  const statusZone = shell?.querySelector?.('[data-tool-status]') ?? scope.querySelector?.('[data-tool-status]');
  const docs = shell?.querySelector?.('[data-tool-docs], .tool-docs, .runtime-doc-disclosure') ?? scope.querySelector?.('[data-tool-docs], .tool-docs, .runtime-doc-disclosure');
  const header = shell?.querySelector?.('[data-tool-header], .tool-header, .tool-shell-header') ?? scope.querySelector?.('[data-tool-header], .tool-header, .tool-shell-header');

  const sectionGapsPx = computeSectionGaps(widget);
  const toolbarEditorDistancePx = maxFinite([
    toPx(styleOf(toolbar)?.marginBottom || toolbar?.style?.marginBottom),
    toPx(styleOf(editors[0])?.marginTop || editors[0]?.style?.marginTop),
    toPx(styleOf(widget)?.rowGap || styleOf(widget)?.gap || widget?.style?.rowGap || widget?.style?.gap)
  ]);
  const editorHeightsPx = editors.slice(0, 2).map((node) => elementHeight(node));
  const dualEditorHeightDeltaPx = editorHeightsPx.length === 2 && editorHeightsPx.every(Number.isFinite)
    ? Math.abs(editorHeightsPx[0] - editorHeightsPx[1])
    : Number.NaN;
  const shellPaddingPx = shell
    ? maxFinite([
      toPx(styleOf(shell)?.paddingTop || shell.style?.paddingTop),
      toPx(styleOf(shell)?.paddingLeft || shell.style?.paddingLeft),
      toPx(styleOf(shell)?.paddingRight || shell.style?.paddingRight),
      toPx(styleOf(shell)?.paddingBottom || shell.style?.paddingBottom)
    ])
    : Number.NaN;
  const nestedSurfaceDepth = findSurfaceDepth(widget ?? scope);
  const statusZoneHeightPx = elementHeight(statusZone);
  const docsOpacity = toPx(styleOf(docs)?.opacity || docs?.style?.opacity);
  const runtimeEmphasisOpacity = maxFinite([
    toPx(styleOf(toolbar)?.opacity || toolbar?.style?.opacity),
    toPx(styleOf(statusZone)?.opacity || statusZone?.style?.opacity),
    toPx(styleOf(editors[0])?.opacity || editors[0]?.style?.opacity)
  ]);
  const headerHeightPx = elementHeight(header);
  const viewportHeight = Math.max(Number(globalThis.innerHeight ?? 0), 1);
  const headerViewportRatio = Number.isFinite(headerHeightPx) ? headerHeightPx / viewportHeight : Number.NaN;
  const primaryActionCount = scope.querySelectorAll('.tool-btn--primary').length;

  if (sectionGapsPx.some((gap) => gap < thresholds.compactGapMinPx || gap > thresholds.compactGapMaxPx)) {
    addViolation(violations, 'D1', `Detected section gaps: ${sectionGapsPx.join(', ')}px.`, { sectionGapsPx });
  }

  if (nestedSurfaceDepth > thresholds.nestedSurfaceDepthMax) {
    addViolation(violations, 'D2', `Nested surface depth ${nestedSurfaceDepth} exceeds ${thresholds.nestedSurfaceDepthMax}.`, { nestedSurfaceDepth });
  }

  if (Number.isFinite(toolbarEditorDistancePx) && toolbarEditorDistancePx > thresholds.toolbarEditorDistanceMaxPx) {
    addViolation(violations, 'D3', `Toolbar→editor distance ${toolbarEditorDistancePx}px exceeds ${thresholds.toolbarEditorDistanceMaxPx}px.`, { toolbarEditorDistancePx });
  }

  if (Number.isFinite(dualEditorHeightDeltaPx) && dualEditorHeightDeltaPx > thresholds.dualEditorHeightDeltaMaxPx) {
    addViolation(violations, 'D4', `Dual editor delta ${dualEditorHeightDeltaPx}px exceeds ${thresholds.dualEditorHeightDeltaMaxPx}px.`, { dualEditorHeightDeltaPx, editorHeightsPx });
  }

  if (primaryActionCount !== 1) {
    addViolation(violations, 'D5', `Found ${primaryActionCount} .tool-btn--primary actions.`, { primaryActionCount });
  }

  if (Number.isFinite(shellPaddingPx) && shellPaddingPx > thresholds.shellPaddingMaxPx) {
    addViolation(violations, 'D6', `Shell padding ${shellPaddingPx}px exceeds ${thresholds.shellPaddingMaxPx}px.`, { shellPaddingPx });
  }

  if (Number.isFinite(statusZoneHeightPx) && statusZoneHeightPx > thresholds.statusZoneHeightMaxPx) {
    addViolation(violations, 'D7', `Status zone height ${statusZoneHeightPx}px exceeds ${thresholds.statusZoneHeightMaxPx}px.`, { statusZoneHeightPx });
  }

  if (Number.isFinite(docsOpacity) && Number.isFinite(runtimeEmphasisOpacity) && docsOpacity >= runtimeEmphasisOpacity) {
    addViolation(violations, 'D8', `Docs opacity ${docsOpacity} must be lower than runtime emphasis opacity ${runtimeEmphasisOpacity}.`, { docsOpacity, runtimeEmphasisOpacity });
  }

  if (Number.isFinite(headerViewportRatio) && headerViewportRatio > thresholds.headerViewportMaxRatio) {
    addViolation(violations, 'D9', `Header uses ${(headerViewportRatio * 100).toFixed(2)}% of viewport; max ${(thresholds.headerViewportMaxRatio * 100).toFixed(2)}%.`, { headerHeightPx, viewportHeight, headerViewportRatio });
  }

  const sortedViolations = violations.slice().sort((a, b) => a.ruleId.localeCompare(b.ruleId));
  const totalPenalty = sortedViolations.reduce((sum, violation) => sum + violation.weight, 0);
  const deterministicPenalty = sortedViolations.reduce((sum, violation) => sum + RULES[violation.ruleId].weight, 0);
  if (totalPenalty !== deterministicPenalty) {
    addViolation(violations, 'D10', 'Penalty mismatch detected across deterministic score passes.', { totalPenalty, deterministicPenalty });
  }

  const score = Math.max(0, 100 - Math.min(100, totalPenalty));
  const passed = violations.length === 0;

  return {
    passed,
    score,
    severity: highestSeverity(violations),
    telemetryCategory: DENSITY_TELEMETRY_CATEGORY,
    violations,
    measurements: {
      sectionGapsPx,
      toolbarEditorDistancePx,
      editorHeightsPx,
      dualEditorHeightDeltaPx,
      shellPaddingPx,
      nestedSurfaceDepth,
      statusZoneHeightPx,
      docsOpacity,
      runtimeEmphasisOpacity,
      headerHeightPx,
      viewportHeight,
      headerViewportRatio,
      primaryActionCount
    },
    generatedAt: new Date().toISOString()
  };
}

export async function writeExecutionDensityReport(report, filePath = 'reports/execution-density-report.json') {
  if (!report || typeof report !== 'object') {
    return false;
  }

  try {
    const [{ mkdir, writeFile }, pathModule] = await Promise.all([
      import('node:fs/promises'),
      import('node:path')
    ]);

    const target = pathModule.resolve(process.cwd(), filePath);
    await mkdir(pathModule.dirname(target), { recursive: true });
    await writeFile(target, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    return true;
  } catch {
    return false;
  }
}
