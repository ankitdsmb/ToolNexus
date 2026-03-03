import fs from 'node:fs/promises';
import path from 'node:path';
import { extractClassSelectorsFromCss } from './css-selector-extractor.mjs';

const repoRoot = process.cwd();
const cssRoot = path.join(repoRoot, 'src', 'ToolNexus.Web', 'wwwroot', 'css');

async function listCssFiles(dir, results = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await listCssFiles(fullPath, results);
      continue;
    }
    if (entry.name.endsWith('.css')) results.push(fullPath);
  }
  return results;
}

const cssFiles = (await listCssFiles(cssRoot)).filter((file) => path.basename(file).startsWith('upgread_'));

const bundles = [];
const selectorOwners = new Map();
for (const file of cssFiles) {
  const css = await fs.readFile(file, 'utf8');
  const selectors = [...extractClassSelectorsFromCss(css)].sort();
  const bundle = path.relative(repoRoot, file).replaceAll('\\', '/');
  bundles.push({ bundle, selectorCount: selectors.length, selectors });

  for (const selector of selectors) {
    if (!selectorOwners.has(selector)) selectorOwners.set(selector, []);
    selectorOwners.get(selector).push(bundle);
  }
}

const duplicates = [...selectorOwners.entries()]
  .map(([selector, owners]) => ({ selector, owners: owners.sort() }))
  .filter(({ owners }) => owners.length > 1)
  .sort((a, b) => b.owners.length - a.owners.length || a.selector.localeCompare(b.selector));

const report = {
  generatedAtUtc: new Date().toISOString(),
  bundleCount: bundles.length,
  uniqueSelectorCount: selectorOwners.size,
  duplicateSelectorCount: duplicates.length,
  bundles: bundles.sort((a, b) => a.bundle.localeCompare(b.bundle)),
  duplicates
};

const outputPath = path.join(repoRoot, 'artifacts', 'css-duplication-matrix.json');
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log('[integrity] css duplication matrix report written');
