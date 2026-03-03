import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, listFiles, writeReport, fileExists } from './shared.mjs';

const IMPORT_RE = /(?:import|export)\s+(?:[^'";]+?\s+from\s+)?["']([^"']+)["']/g;
const DYN_RE = /import\(\s*["']([^"']+)["']\s*\)/g;

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const abs = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [abs, `${abs}.js`, `${abs}.mjs`, path.join(abs, 'index.js')];
  return candidates;
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

const unreachable = [...nodes].filter((n) => !reachable.has(n));
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
  violations
};

await writeReport(`${config.reportDir}/static-graph.json`, report);

if (violations.length > 0) {
  console.error('[integrity] static graph validation failed. See reports/integrity/static-graph.json');
  process.exit(1);
}

console.log('[integrity] static graph validation passed');
