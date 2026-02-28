import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { EXECUTION_UI_IMMUNITY, scoreFromViolations, severityForRule } from '../src/ToolNexus.Web/wwwroot/js/runtime/execution-ui-immunity-constants.js';

const repoRoot = resolve('.');
const webRoot = join(repoRoot, 'src/ToolNexus.Web/wwwroot');
const cssDirs = [join(webRoot, 'css/pages'), join(webRoot, 'css/tools')];
const templateDir = join(webRoot, 'tool-templates');
const manifestPath = join(repoRoot, 'tools.manifest.json');
const configPath = join(repoRoot, 'config.ui-immunity-thresholds.json');
const reportDir = join(repoRoot, 'reports');
const jsonReportPath = join(reportDir, 'execution-ui-immunity-report.json');
const mdReportPath = join(reportDir, 'execution-ui-immunity-report.md');

const toolsManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const thresholds = config.density;
const strictMode = process.env.TOOLNEXUS_UI_IMMUNITY_STRICT === '1' || process.env.CI === 'true' || Boolean(config.strictMode);

function listFiles(dir, ext = '.css') {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(ext))
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

function getToolName(filePath) {
  return filePath.split('/').pop().replace(/\.(css|html)$/u, '');
}

function parseBlocks(cssText) {
  const blocks = [];
  const regex = /([^{}]+)\{([^}]*)\}/gmu;
  let match;
  while ((match = regex.exec(cssText)) !== null) {
    blocks.push({ selector: match[1].trim(), body: match[2].trim() });
  }
  return blocks;
}

function addViolation(target, violation) {
  target.violations.push(violation);
}

function scanCssFile(filePath, toolResult) {
  const css = readFileSync(filePath, 'utf8');
  const blocks = parseBlocks(css);
  const shellSelectors = EXECUTION_UI_IMMUNITY.shellSelectors;

  for (const block of blocks) {
    const selector = block.selector;
    const body = block.body.toLowerCase();

    if (shellSelectors.some((shellSel) => selector.includes(shellSel))) {
      if (config.forbiddenCss.shellLayoutProperties.some((prop) => body.includes(prop))) {
        addViolation(toolResult, {
          ruleId: 'RULE_1',
          severity: severityForRule('RULE_1'),
          message: `Tool CSS controls shell layout via selector: ${selector}`,
          file: filePath
        });
      }

      addViolation(toolResult, {
        ruleId: 'RULE_7',
        severity: severityForRule('RULE_7'),
        message: `Tool CSS targets shell or data-tool-* anchors: ${selector}`,
        file: filePath
      });
    }

    if (/grid-template-columns\s*:/u.test(body) && shellSelectors.some((shellSel) => selector.includes(shellSel))) {
      addViolation(toolResult, {
        ruleId: 'RULE_10',
        severity: severityForRule('RULE_10'),
        message: `Shell layout redefined by tool CSS: ${selector}`,
        file: filePath
      });
    }

    if (/\b100vh\b/u.test(body)) {
      addViolation(toolResult, {
        ruleId: 'RULE_3',
        severity: severityForRule('RULE_3'),
        message: '100vh lock detected (density/layout risk)',
        file: filePath
      });
    }

    if (/position\s*:\s*absolute/u.test(body) && /(runtime|tool-local-body|tool-runtime-widget|tool-shell)/u.test(selector)) {
      addViolation(toolResult, {
        ruleId: 'RULE_3',
        severity: severityForRule('RULE_3'),
        message: `Absolute positioning affecting runtime layout: ${selector}`,
        file: filePath
      });
    }

    if (/overflow\s*:\s*hidden/u.test(body) && /(runtime|tool-local-body|tool-runtime-widget|tool-shell)/u.test(selector)) {
      addViolation(toolResult, {
        ruleId: 'RULE_3',
        severity: severityForRule('RULE_3'),
        message: `overflow:hidden on runtime container: ${selector}`,
        file: filePath
      });
    }

    const fixedHeightMatch = body.match(/height\s*:\s*(\d+)px/u);
    if (fixedHeightMatch && Number(fixedHeightMatch[1]) > thresholds.fixedHeightMaxPx) {
      addViolation(toolResult, {
        ruleId: 'RULE_3',
        severity: severityForRule('RULE_3'),
        message: `Fixed height ${fixedHeightMatch[1]}px exceeds threshold ${thresholds.fixedHeightMaxPx}px`,
        file: filePath
      });
    }

    const gapMatches = [...body.matchAll(/(?:gap|row-gap|column-gap)\s*:\s*(\d+)px/gu)];
    for (const m of gapMatches) {
      const gap = Number(m[1]);
      if (gap < thresholds.minGapPx || gap > thresholds.maxGapPx) {
        addViolation(toolResult, {
          ruleId: 'RULE_3',
          severity: severityForRule('RULE_3'),
          message: `Gap ${gap}px outside allowed range (${thresholds.minGapPx}-${thresholds.maxGapPx}px)`,
          file: filePath
        });
      }
    }
  }
}

function scanTemplate(filePath, toolResult) {
  const html = readFileSync(filePath, 'utf8');
  const required = ['tool-runtime-widget', 'tool-local-header', 'tool-local-actions', 'tool-local-body', 'tool-local-metrics'];

  for (const cls of required) {
    if (!html.includes(cls)) {
      addViolation(toolResult, {
        ruleId: 'RULE_2',
        severity: severityForRule('RULE_2'),
        message: `Missing required template class: ${cls}`,
        file: filePath
      });
    }
  }

  const shellAnchors = ['data-tool-shell', 'data-tool-context', 'data-tool-status', 'data-tool-followup', 'data-tool-input', 'data-tool-output'];
  for (const anchor of shellAnchors) {
    if (html.includes(anchor)) {
      addViolation(toolResult, {
        ruleId: 'RULE_2',
        severity: severityForRule('RULE_2'),
        message: `Template recreates shell anchor: ${anchor}`,
        file: filePath
      });
    }
  }

  const nestedWidgetCount = (html.match(/class="[^"]*tool-runtime-widget[^"]*"/gu) ?? []).length;
  if (nestedWidgetCount > 1) {
    addViolation(toolResult, {
      ruleId: 'RULE_6',
      severity: severityForRule('RULE_6'),
      message: `Nested runtime containers detected (count: ${nestedWidgetCount})`,
      file: filePath
    });
  }

  const actionsRoot = html.match(/<div class="tool-runtime-widget">([\s\S]*?)<\/div>\s*$/u)?.[1] ?? html;
  const primaryCount = (actionsRoot.match(/\bdata-tool-primary-action\b/gu) ?? []).length;
  if (primaryCount !== 1) {
    addViolation(toolResult, {
      ruleId: 'RULE_4',
      severity: severityForRule('RULE_4'),
      message: `Expected exactly one primary action per tool, found ${primaryCount}`,
      file: filePath
    });
  }
}

function normalizeSeverity(violations) {
  if (violations.some((v) => v.severity === 'critical')) return 'critical';
  if (violations.some((v) => v.severity === 'high')) return 'high';
  if (violations.length > 0) return 'medium';
  return 'none';
}

function recommendationFor(v) {
  const map = {
    RULE_1: 'Move shell layout declarations into shell-owned CSS only.',
    RULE_2: 'Keep all tool UI inside a single .tool-runtime-widget and required local sections.',
    RULE_3: 'Adjust spacing/heights to configured density thresholds.',
    RULE_4: 'Keep exactly one primary action in tool-local-actions.',
    RULE_6: 'Remove nested runtime containers from templates.',
    RULE_7: 'Do not target shell anchors from tool CSS.',
    RULE_10: 'Remove shell grid/layout overrides from tool CSS.'
  };
  return map[v.ruleId] ?? 'Review template/CSS against execution UI law.';
}

const tools = Array.isArray(toolsManifest.tools) ? toolsManifest.tools.map((t) => t.slug) : [];
const results = new Map(tools.map((slug) => [slug, { tool: slug, violations: [] }]));

for (const cssDir of cssDirs) {
  for (const cssFile of listFiles(cssDir, '.css')) {
    const tool = getToolName(cssFile);
    if (!results.has(tool)) continue;
    scanCssFile(cssFile, results.get(tool));
  }
}

for (const templateFile of listFiles(templateDir, '.html')) {
  const tool = getToolName(templateFile);
  if (!results.has(tool)) continue;
  scanTemplate(templateFile, results.get(tool));
}

const reportTools = [];
let totalViolations = 0;
let weightedDeductions = 0;
let hasFailures = false;

for (const [, entry] of results) {
  totalViolations += entry.violations.length;
  const severity = normalizeSeverity(entry.violations);
  const uniqRecommendations = [...new Set(entry.violations.map(recommendationFor))];
  const scorePenalty = EXECUTION_UI_IMMUNITY.score.base - scoreFromViolations(entry.violations);
  weightedDeductions += scorePenalty;
  hasFailures ||= entry.violations.length > 0;

  reportTools.push({
    tool: entry.tool,
    violationsCount: entry.violations.length,
    severity,
    recommendations: uniqRecommendations,
    violations: entry.violations
  });
}

const executionUiScore = Math.max(0, EXECUTION_UI_IMMUNITY.score.base - weightedDeductions);

mkdirSync(reportDir, { recursive: true });
const reportPayload = {
  generatedAt: new Date().toISOString(),
  strictMode,
  totals: {
    toolCount: reportTools.length,
    violations: totalViolations,
    executionUiScore
  },
  tools: reportTools
};

writeFileSync(jsonReportPath, JSON.stringify(reportPayload, null, 2));

const lines = [
  '# Execution UI Immunity Report',
  '',
  `- Generated: ${reportPayload.generatedAt}`,
  `- Strict mode: ${reportPayload.strictMode}`,
  `- Execution UI Score: **${executionUiScore}/100**`,
  `- Total Violations: **${totalViolations}**`,
  '',
  '## Validation Rules',
  '',
  '1. RULE 1 — Shell ownership',
  '2. RULE 2 — Widget isolation',
  '3. RULE 3 — Density safety',
  '4. RULE 4 — Action hierarchy',
  '5. RULE 5 — Editor balance',
  '6. RULE 6 — No nested runtime containers',
  '7. RULE 7 — Tool CSS cannot override shell anchors',
  '8. RULE 8 — Docs visual secondary',
  '9. RULE 9 — Runtime status visible',
  '10. RULE 10 — Shell layout cannot be redefined by tool CSS',
  '',
  '## Per Tool Results',
  ''
];

for (const tool of reportTools) {
  lines.push(`### ${tool.tool}`);
  lines.push(`- Violations: ${tool.violationsCount}`);
  lines.push(`- Severity: ${tool.severity}`);
  if (tool.violationsCount === 0) {
    lines.push('- Status: pass');
  } else {
    lines.push('- Status: fail');
    for (const v of tool.violations) {
      lines.push(`  - [${v.ruleId}] (${v.severity}) ${v.message}`);
    }
    lines.push('- Recommendations:');
    for (const rec of tool.recommendations) {
      lines.push(`  - ${rec}`);
    }
  }
  lines.push('');
}

writeFileSync(mdReportPath, `${lines.join('\n')}\n`);

console.log(`Execution UI immunity report generated: ${jsonReportPath}`);
console.log(`Execution UI immunity markdown report: ${mdReportPath}`);
console.log(`Execution UI Score: ${executionUiScore}/100`);

if (strictMode && hasFailures) {
  console.error('Execution UI immunity check failed in strict mode.');
  process.exit(1);
}
