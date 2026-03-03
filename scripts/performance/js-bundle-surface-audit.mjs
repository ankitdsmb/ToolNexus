import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const jsRootDir = path.join(repoRoot, 'src/ToolNexus.Web/wwwroot/js');

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.isFile() && /\.(m?js)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

function parseImports(code) {
  const staticImports = [];
  const dynamicImports = [];
  const importRe = /import\s+(?:[^'"()]+?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicRe = /import\s*\(\s*["']([^"']+)["']\s*\)/g;
  let match;
  while ((match = importRe.exec(code)) !== null) staticImports.push(match[1]);
  while ((match = dynamicRe.exec(code)) !== null) dynamicImports.push(match[1]);
  return { staticImports, dynamicImports };
}

function resolveImport(fromFile, specifier, index) {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [base, `${base}.js`, `${base}.mjs`, path.join(base, 'index.js'), path.join(base, 'index.mjs')];
  for (const candidate of candidates) if (index.has(candidate)) return candidate;
  return null;
}

const files = (await walk(jsRootDir)).sort();
const index = new Set(files);
const modules = [];
const byFile = new Map();

for (const file of files) {
  const code = await fs.readFile(file, 'utf8');
  const stat = await fs.stat(file);
  const { staticImports, dynamicImports } = parseImports(code);
  const rec = { file, rel: path.relative(repoRoot, file).replaceAll('\\\\', '/'), size: stat.size, staticImports, dynamicImports, resolvedStatic: [], resolvedDynamic: [] };
  modules.push(rec);
  byFile.set(file, rec);
}

for (const mod of modules) {
  mod.resolvedStatic = mod.staticImports.map((i) => resolveImport(mod.file, i, index)).filter(Boolean);
  mod.resolvedDynamic = mod.dynamicImports.map((i) => resolveImport(mod.file, i, index)).filter(Boolean);
}

const staticTargetSet = new Set(modules.flatMap((m) => m.resolvedStatic));
const dynamicTargetSet = new Set(modules.flatMap((m) => m.resolvedDynamic));
const entryPoints = modules.filter((m) => !staticTargetSet.has(m.file));
const reachable = new Set();
const queue = entryPoints.map((m) => m.file);
while (queue.length) {
  const current = queue.pop();
  if (reachable.has(current)) continue;
  reachable.add(current);
  const mod = byFile.get(current);
  if (!mod) continue;
  for (const target of mod.resolvedStatic) queue.push(target);
}

const report = {
  generatedAt: new Date().toISOString(),
  totalModuleCount: modules.length,
  entryPointsCount: entryPoints.length,
  dynamicModuleCount: dynamicTargetSet.size,
  staticallyReachableModules: reachable.size,
  largest20FilesBySize: [...modules].sort((a, b) => b.size - a.size).slice(0, 20).map(({ rel, size }) => ({ file: rel, size })),
  modulesOver30KB: modules.filter((m) => m.size > 30 * 1024).map((m) => ({ file: m.rel, size: m.size })),
  staticVsDynamicRatio: {
    staticTargets: staticTargetSet.size,
    dynamicTargets: dynamicTargetSet.size,
    ratio: dynamicTargetSet.size === 0 ? null : Number((staticTargetSet.size / dynamicTargetSet.size).toFixed(3))
  },
  totalEstimatedJsPayloadSize: modules.reduce((sum, m) => sum + m.size, 0),
  dynamicRootDistribution: entryPoints.map((entry) => ({ file: entry.rel, dynamicImportCount: entry.dynamicImports.length })).filter((x) => x.dynamicImportCount > 0).sort((a, b) => b.dynamicImportCount - a.dynamicImportCount)
};

await fs.mkdir(path.join(repoRoot, 'artifacts'), { recursive: true });
await fs.writeFile(path.join(repoRoot, 'artifacts/js-bundle-surface-report.json'), JSON.stringify(report, null, 2));
console.log('Wrote artifacts/js-bundle-surface-report.json');
