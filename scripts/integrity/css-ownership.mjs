import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { extractClassSelectorsFromCss, extractSelectorDeclarationsFromCss } from './css-selector-extractor.mjs';

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

function normalizeDeclarationBlock(block) {
  const stripped = block.replace(/\/\*[\s\S]*?\*\//g, ' ');

  const properties = stripped
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf(':');
      if (separatorIndex === -1) return null;
      const property = part.slice(0, separatorIndex).trim().toLowerCase();
      const value = part
        .slice(separatorIndex + 1)
        .replace(/\s+/g, ' ')
        .replace(/\s*!important\s*/gi, ' !important')
        .trim();

      if (!property || !value) return null;
      return `${property}:${value}`;
    })
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return properties.join(';');
}

function hashDeclarationIdentity(selector, mediaContext, normalizedBlock) {
  return crypto
    .createHash('sha1')
    .update(`${selector}|${mediaContext}|${normalizedBlock}`)
    .digest('hex');
}

const cssFiles = (await listCssFiles(cssRoot)).filter((file) => path.basename(file).startsWith('upgread_'));

const bundles = [];
const selectorOwners = new Map();
const declarationOwners = new Map();

for (const file of cssFiles) {
  const css = await fs.readFile(file, 'utf8');
  const selectors = [...extractClassSelectorsFromCss(css)].sort();
  const bundle = path.relative(repoRoot, file).replaceAll('\\', '/');
  bundles.push({ bundle, selectorCount: selectors.length, selectors });

  for (const selector of selectors) {
    if (!selectorOwners.has(selector)) selectorOwners.set(selector, new Set());
    selectorOwners.get(selector).add(bundle);
  }

  const declarationRules = extractSelectorDeclarationsFromCss(css);
  const bundleDeclarationHashes = new Set();

  for (const rule of declarationRules) {
    const normalizedSelector = rule.selector.replace(/\s+/g, ' ').trim();
    const normalizedBlock = normalizeDeclarationBlock(rule.declarationBlock);
    if (!normalizedSelector || !normalizedBlock) continue;

    const mediaContext = (rule.mediaContext || 'global').replace(/\s+/g, ' ').trim();
    const declarationHash = hashDeclarationIdentity(normalizedSelector, mediaContext, normalizedBlock);
    if (bundleDeclarationHashes.has(declarationHash)) continue;
    bundleDeclarationHashes.add(declarationHash);

    if (!declarationOwners.has(declarationHash)) {
      declarationOwners.set(declarationHash, {
        selector: normalizedSelector,
        mediaContext,
        bundles: new Set()
      });
    }

    declarationOwners.get(declarationHash).bundles.add(bundle);
  }
}

const selectorOverlaps = [...selectorOwners.entries()]
  .map(([selector, owners]) => ({ selector, owners: [...owners].sort() }))
  .filter(({ owners }) => owners.length > 1)
  .sort((a, b) => b.owners.length - a.owners.length || a.selector.localeCompare(b.selector));

const duplicateEntries = [...declarationOwners.entries()]
  .map(([hash, entry]) => ({
    hash,
    selector: entry.selector,
    mediaContext: entry.mediaContext,
    bundles: [...entry.bundles].sort()
  }))
  .filter((entry) => entry.bundles.length > 1)
  .sort((a, b) => b.bundles.length - a.bundles.length || a.selector.localeCompare(b.selector));

const duplicatesByHash = Object.fromEntries(
  duplicateEntries.map((entry) => [
    entry.hash,
    {
      selector: entry.selector,
      mediaContext: entry.mediaContext,
      bundles: entry.bundles
    }
  ])
);

const report = {
  generatedAtUtc: new Date().toISOString(),
  bundleCount: bundles.length,
  uniqueSelectorCount: selectorOwners.size,
  selectorOverlapCount: selectorOverlaps.length,
  identicalDeclarationDuplicateCount: duplicateEntries.length,
  bundles: bundles.sort((a, b) => a.bundle.localeCompare(b.bundle)),
  duplicatesByHash,
  selectorOverlaps
};

const outputPath = path.join(repoRoot, 'artifacts', 'css-duplication-matrix.json');
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log('[integrity] css duplication matrix report written');
