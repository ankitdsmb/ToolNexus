import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const cssRoot = path.join(repoRoot, 'src/ToolNexus.Web/wwwroot/css');
const outputPath = path.join(repoRoot, 'artifacts/css-metrics.json');
const baselinePath = path.join(repoRoot, 'config/integrity/css-audit-baseline.json');
const maxSelectorDepthThreshold = 6;

const files = await listCssFiles(cssRoot);

const importantByFile = {};
const selectorDepthByFile = {};
const specificityHistogram = {};
const selectorOccurrences = new Map();
const breakpointFrequency = {};
const transitionAllFindings = [];

let maxSelectorDepthGlobal = 0;
let totalImportant = 0;
let duplicateSelectorCount = 0;

for (const file of files) {
  const absolute = path.join(repoRoot, file);
  const css = await fs.readFile(absolute, 'utf8');

  const importantCount = (css.match(/!important\b/g) ?? []).length;
  importantByFile[file] = importantCount;
  totalImportant += importantCount;

  const selectors = extractSelectors(css);
  let fileMaxDepth = 0;

  for (const selector of selectors) {
    const normalized = normalizeSelector(selector);
    if (!normalized) {
      continue;
    }

    selectorOccurrences.set(normalized, (selectorOccurrences.get(normalized) ?? 0) + 1);

    const depth = computeSelectorDepth(normalized);
    fileMaxDepth = Math.max(fileMaxDepth, depth);
    maxSelectorDepthGlobal = Math.max(maxSelectorDepthGlobal, depth);

    const specificity = computeSpecificity(normalized);
    const bucket = `${specificity.a},${specificity.b},${specificity.c}`;
    specificityHistogram[bucket] = (specificityHistogram[bucket] ?? 0) + 1;
  }

  selectorDepthByFile[file] = fileMaxDepth;

  const mediaBreakpoints = extractBreakpoints(css);
  for (const bp of mediaBreakpoints) {
    breakpointFrequency[bp] = (breakpointFrequency[bp] ?? 0) + 1;
  }

  const transitions = extractTransitionAll(css, file);
  transitionAllFindings.push(...transitions);
}

const duplicateSelectors = [];
for (const [selector, count] of selectorOccurrences.entries()) {
  if (count > 1) {
    duplicateSelectors.push({ selector, count });
    duplicateSelectorCount += 1;
  }
}

duplicateSelectors.sort((a, b) => b.count - a.count || a.selector.localeCompare(b.selector));

const metrics = {
  generatedAtUtc: new Date().toISOString(),
  summary: {
    cssFileCount: files.length,
    totalImportant,
    duplicateSelectorCount,
    maxSelectorDepth: maxSelectorDepthGlobal,
    uniqueBreakpoints: Object.keys(breakpointFrequency).sort(),
    transitionAllCount: transitionAllFindings.length
  },
  reports: {
    importantByFile,
    maxSelectorDepthByFile: selectorDepthByFile,
    specificityHistogram,
    duplicateSelectors,
    breakpointFrequency,
    transitionAll: transitionAllFindings
  }
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(metrics, null, 2) + '\n', 'utf8');

let baseline = null;
try {
  baseline = JSON.parse(await fs.readFile(baselinePath, 'utf8'));
} catch {
  baseline = null;
}

const failures = [];
if (baseline) {
  if (totalImportant > (baseline.totalImportant ?? 0)) {
    failures.push(`New !important count increased (${totalImportant} > ${baseline.totalImportant}).`);
  }

  const baselineBreakpoints = new Set(baseline.uniqueBreakpoints ?? []);
  const newBreakpoints = Object.keys(breakpointFrequency).filter((bp) => !baselineBreakpoints.has(bp));
  if (newBreakpoints.length > 0) {
    failures.push(`New breakpoint value detected: ${newBreakpoints.join(', ')}.`);
  }

  if (duplicateSelectorCount > (baseline.duplicateSelectorCount ?? 0)) {
    failures.push(
      `Duplicate selector count increased (${duplicateSelectorCount} > ${baseline.duplicateSelectorCount}).`
    );
  }
}

if (maxSelectorDepthGlobal > maxSelectorDepthThreshold) {
  failures.push(
    `Selector depth threshold exceeded (${maxSelectorDepthGlobal} > ${maxSelectorDepthThreshold}).`
  );
}

if (failures.length > 0) {
  console.error('[css-audit] Fail thresholds violated:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('[css-audit] Metrics written to artifacts/css-metrics.json');

function extractSelectors(css) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = [];
  const blockRegex = /([^{}]+)\{/g;
  let match;

  while ((match = blockRegex.exec(withoutComments)) !== null) {
    const head = match[1].trim();
    if (!head || head.startsWith('@')) {
      continue;
    }

    for (const selector of splitSelectors(head)) {
      selectors.push(selector);
    }
  }

  return selectors;
}

function splitSelectors(head) {
  const result = [];
  let current = '';
  let bracketDepth = 0;
  let parenDepth = 0;

  for (const char of head) {
    if (char === '[') bracketDepth += 1;
    if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    if (char === '(') parenDepth += 1;
    if (char === ')') parenDepth = Math.max(0, parenDepth - 1);

    if (char === ',' && bracketDepth === 0 && parenDepth === 0) {
      if (current.trim()) {
        result.push(current.trim());
      }
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    result.push(current.trim());
  }

  return result;
}

function normalizeSelector(selector) {
  return selector.replace(/\s+/g, ' ').trim();
}

function computeSelectorDepth(selector) {
  const parts = selector
    .replace(/[>+~]/g, ' ')
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length;
}

function computeSpecificity(selector) {
  const value = selector;

  const a = (value.match(/#[\w-]+/g) ?? []).length;
  const classCount = (value.match(/\.[\w-]+/g) ?? []).length;
  const attrCount = (value.match(/\[[^\]]+\]/g) ?? []).length;
  const pseudoElementCount = (value.match(/::[\w-]+/g) ?? []).length;
  const pseudoClassCount = (value.match(/:[\w-]+(?:\([^)]*\))?/g) ?? []).length - pseudoElementCount;

  const cleaned = value
    .replace(/#[\w-]+/g, ' ')
    .replace(/\.[\w-]+/g, ' ')
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/::[\w-]+/g, ' ')
    .replace(/:[\w-]+(?:\([^)]*\))?/g, ' ')
    .replace(/[>+~*,]/g, ' ');

  const typeCount = (cleaned.match(/\b[a-zA-Z][\w-]*\b/g) ?? []).length;

  return {
    a,
    b: classCount + attrCount + Math.max(0, pseudoClassCount),
    c: typeCount + pseudoElementCount
  };
}

function extractBreakpoints(css) {
  const values = [];
  const regex = /@media[^{]*\((?:min|max)-width\s*:\s*([0-9.]+(?:px|em|rem|vw|vh))\)/g;
  let match;
  while ((match = regex.exec(css)) !== null) {
    values.push(match[1]);
  }
  return values;
}

function extractTransitionAll(css, file) {
  const findings = [];
  const transitionRegex = /(transition(?:-property)?\s*:[^;]*\ball\b[^;]*;)/g;
  let match;

  while ((match = transitionRegex.exec(css)) !== null) {
    const index = match.index;
    const line = css.slice(0, index).split('\n').length;

    findings.push({
      file,
      line,
      declaration: match[1].trim()
    });
  }

  return findings;
}


async function listCssFiles(rootDir) {
  const output = [];

  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile() && entry.name.endsWith('.css')) {
        output.push(path.relative(repoRoot, absolute).replace(/\\/g, '/'));
      }
    }
  }

  await walk(rootDir);
  output.sort();
  return output;
}
