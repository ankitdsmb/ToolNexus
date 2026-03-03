import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const srcRoot = path.join(repoRoot, 'src');

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.css')) out.push(full);
  }
  return out;
}

const cssFiles = (await walk(srcRoot)).sort();
const selectorCountByFile = [];
const selectorToFiles = new Map();
let totalSelectors = 0;
let importantCount = 0;
let maxSelectorDepth = 0;
let totalCssPayload = 0;

for (const file of cssFiles) {
  const content = await fs.readFile(file, 'utf8');
  const rel = path.relative(repoRoot, file).replaceAll('\\\\', '/');
  const stat = await fs.stat(file);
  totalCssPayload += stat.size;
  const ruleMatches = [...content.matchAll(/([^{}@]+)\{/g)].map((m) => m[1].trim()).filter(Boolean);
  let fileSelectorCount = 0;
  for (const rule of ruleMatches) {
    for (const selector of rule.split(',')) {
      const clean = selector.trim();
      if (!clean || clean.startsWith('@')) continue;
      fileSelectorCount += 1;
      totalSelectors += 1;
      const depth = clean.split(/\s+|>|\+|~/).filter(Boolean).length;
      maxSelectorDepth = Math.max(maxSelectorDepth, depth);
      if (!selectorToFiles.has(clean)) selectorToFiles.set(clean, new Set());
      selectorToFiles.get(clean).add(rel);
    }
  }
  importantCount += (content.match(/!important/g) || []).length;
  selectorCountByFile.push({ file: rel, selectors: fileSelectorCount, size: stat.size });
}

const upgreadFiles = selectorCountByFile.map((x) => x.file).filter((f) => /upgread/i.test(f));
let overlapCount = 0;
if (upgreadFiles.length > 1) {
  for (const files of selectorToFiles.values()) {
    const overlap = upgreadFiles.filter((f) => files.has(f)).length;
    if (overlap > 1) overlapCount += 1;
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  totalSelectorCount: totalSelectors,
  uniqueSelectorCount: selectorToFiles.size,
  maxSelectorDepth,
  importantUsageCount: importantCount,
  duplicateSelectorCount: [...selectorToFiles.values()].filter((files) => files.size > 1).length,
  bundleLevelSelectorDistribution: selectorCountByFile.sort((a, b) => b.selectors - a.selectors).map(({ file, selectors }) => ({ file, selectorCount: selectors })),
  largest20CssFilesBySize: [...selectorCountByFile].sort((a, b) => b.size - a.size).slice(0, 20).map(({ file, size }) => ({ file, size })),
  totalCssPayloadSize: totalCssPayload,
  overlapCountAcrossUpgreadBundles: overlapCount
};

await fs.mkdir(path.join(repoRoot, 'artifacts'), { recursive: true });
await fs.writeFile(path.join(repoRoot, 'artifacts/css-surface-report.json'), JSON.stringify(report, null, 2));
console.log('Wrote artifacts/css-surface-report.json');
