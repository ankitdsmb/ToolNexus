import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { loadConfig, listFiles, writeReport, fileExists } from './shared.mjs';

const IMPORT_RE = /(?:import|export)\s+(?:[^'";]+?\s+from\s+)?["']([^"']+)["']/g;
const DYN_RE = /import\(\s*["']([^"']+)["']\s*\)/g;

const dynamicRoots = JSON.parse(
  fsSync.readFileSync('./docs/dynamic-import-roots.json', 'utf8')
);

const ROOT_WEIGHT_BY_TYPE = {
  'slug-runtime': 0.35,
  'modulePath-runtime': 0.3,
  'legacy-bootstrap': 0.25,
  'lazy-loader': 0.4
};

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const abs = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [abs, `${abs}.js`, `${abs}.mjs`, path.join(abs, 'index.js')];
  return candidates;
}

function getDynamicRootMatch(filePath) {
  return dynamicRoots.roots.find((root) => {
    if (root.type === 'slug-runtime') {
      return filePath.includes('/js/tools/');
    }
    if (root.type === 'modulePath-runtime') {
      return true;
    }
    if (root.type === 'legacy-bootstrap') {
      return true;
    }
    if (root.type === 'lazy-loader') {
      return filePath.endsWith('command-palette.js');
    }
    return false;
  });
}

function getDynamicRootWeight(root) {
  if (!root) return null;
  if (typeof root.confidenceWeight === 'number') {
    return root.confidenceWeight;
  }
  return ROOT_WEIGHT_BY_TYPE[root.type] ?? 0.3;
}

const config = await loadConfig();
const jsFiles = await listFiles([
  `${config.jsRoot}/**/*.js`,
  `!${config.jsRoot}/lib/**`,
  `!${config.jsRoot}/vendor/**`,
  `!${config.jsRoot}/**/*.min.js`
]);

const graph = {};
const violations = [];
const nodes = new Set(jsFiles);

for (const file of jsFiles) {
  const src = await fs.readFile(file, 'utf8');
  const staticImports = [...src.matchAll(IMPORT_RE)].map((m) => m[1]);
  const dynamicLiteralImports = [...src.matchAll(DYN_RE)].map((m) => m[1]);
  const unresolved = [];
  const edges = [];

  for (const specifier of [...staticImports, ...dynamicLiteralImports]) {
    const resolvedCandidates = resolveImport(file, specifier);
    if (!resolvedCandidates) continue;
    let matched = null;
    for (const candidate of resolvedCandidates) {
      const rel = path.relative(process.cwd(), candidate).replace(/\\/g, '/');
      if (await fileExists(rel)) {
        matched = rel;
        break;
      }
    }
    if (!matched) unresolved.push(specifier);
    else edges.push(matched);
  }

  graph[file] = { edges, unresolved, staticImports, dynamicLiteralImports };

  if (unresolved.length > 0) {
    violations.push({ type: 'unresolved_relative_imports', file, imports: unresolved });
  }
}

const razorFiles = await listFiles([`${config.razorRoot}/**/*.cshtml`, 'src/ToolNexus.Web/Areas/**/*.cshtml']);
const entrypoints = new Set();
for (const razorFile of razorFiles) {
  const content = await fs.readFile(razorFile, 'utf8');
  const matches = content.matchAll(/<script[^>]+src=["']~?\/?([^"']+\.js)["']/gi);
  for (const m of matches) {
    const jsRel = `src/ToolNexus.Web/wwwroot/${m[1].replace(/^\//, '')}`;
    if (nodes.has(jsRel)) entrypoints.add(jsRel);
  }
}

for (const file of jsFiles) {
  if (file.endsWith('/tool-runtime.js')) entrypoints.add(file);
}

const reachable = new Set(entrypoints);
const stack = [...entrypoints];
while (stack.length > 0) {
  const current = stack.pop();
  for (const next of graph[current]?.edges ?? []) {
    if (nodes.has(next) && !reachable.has(next)) {
      reachable.add(next);
      stack.push(next);
    }
  }
}

const scoredModules = [...nodes].map((filePath) => {
  if (reachable.has(filePath)) {
    return { filePath, confidence: 1.0, confidenceWeight: 1.0, classification: 'reachable' };
  }

  const dynamicRootMatch = getDynamicRootMatch(filePath);
  if (dynamicRootMatch) {
    const confidenceWeight = getDynamicRootWeight(dynamicRootMatch);
    return {
      filePath,
      confidence: confidenceWeight,
      confidenceWeight,
      classification: 'protected-dynamic',
      rootType: dynamicRootMatch.type
    };
  }

  return { filePath, confidence: 0.8, confidenceWeight: 0.8, classification: 'high-confidence-dead' };
});

const unreachable = scoredModules
  .filter((module) => module.classification !== 'reachable')
  .map((module) => module.filePath);

const reclassifiedModules = scoredModules.map((module) => {
  if (module.classification === 'reachable' || module.classification === 'protected-dynamic') {
    return module;
  }

  const classification = module.confidence >= 0.8 ? 'high-confidence-dead' : 'medium-risk';
  return { ...module, classification };
});

const enforceUnreachable = config.staticGraph?.enforceUnreachable ?? false;
if (enforceUnreachable && unreachable.length > 0) {
  violations.push({ type: 'unreachable_modules', count: unreachable.length, sample: unreachable.slice(0, 50) });
}

const report = {
  timestampUtc: new Date().toISOString(),
  summary: {
    moduleCount: nodes.size,
    entrypointCount: entrypoints.size,
    reachableCount: reachable.size,
    unreachableCount: unreachable.length,
    violationCount: violations.length
  },
  entrypoints: [...entrypoints],
  graph,
  unreachable,
  confidenceScores: reclassifiedModules,
  violations
};

await writeReport(`${config.reportDir}/static-graph.json`, report);

const confidenceDistribution = reclassifiedModules.reduce(
  (acc, module) => {
    acc[module.classification] = (acc[module.classification] ?? 0) + 1;
    return acc;
  },
  { 'high-confidence-dead': 0, 'protected-dynamic': 0, 'medium-risk': 0, reachable: 0 }
);

const governanceReport = {
  protectedRootsCount: dynamicRoots.roots.length,
  protectedPatterns: dynamicRoots.roots.map((root) => root.pattern),
  adjustedUnreachableCount: reclassifiedModules.filter((module) => module.classification !== 'reachable').length,
  confidenceDistribution
};

await fs.mkdir('artifacts', { recursive: true });
await fs.writeFile('artifacts/dynamic-import-governance-report.json', `${JSON.stringify(governanceReport, null, 2)}\n`, 'utf8');

const jsGovernanceReport = {
  reachableCount: confidenceDistribution.reachable,
  protectedDynamicCount: confidenceDistribution['protected-dynamic'],
  mediumRiskCount: confidenceDistribution['medium-risk'],
  highConfidenceDeadCount: confidenceDistribution['high-confidence-dead']
};

await fs.writeFile('artifacts/js-governance-report.json', `${JSON.stringify(jsGovernanceReport, null, 2)}\n`, 'utf8');

if (violations.length > 0) {
  console.error('[integrity] static graph validation failed. See reports/integrity/static-graph.json');
  process.exit(1);
}

console.log('[integrity] static graph validation passed');
