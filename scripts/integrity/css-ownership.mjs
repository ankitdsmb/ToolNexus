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
  const normalized = stripped
    .replace(/\s+/g, ' ')
    .replace(/\s*:\s*/g, ':')
    .replace(/\s*;\s*/g, ';')
    .trim();

  const properties = normalized
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/\s*!important\s*$/i, '!important'))
    .sort((a, b) => a.localeCompare(b));

  return properties.join(';');
}

function hashDeclarationIdentity(selector, mediaContext, normalizedBlock) {
  return crypto
    .createHash('sha256')
    .update(`${selector}|${mediaContext}|${normalizedBlock}`)
    .digest('hex');
}

const cssFiles = (await listCssFiles(cssRoot)).filter((file) => path.basename(file).startsWith('upgread_'));

const bundles = [];
const selectorOwners = new Map();
const declarationOwners = new Map();

for (const file of cssFiles) {
  const css = await fs.readFile(file, 'utf8');
  const signatures = extractClassRuleSignatures(css);
  const selectors = [...new Set(signatures.map((signature) => signature.selector))].sort();
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

    const mediaContext = rule.mediaContext ? rule.mediaContext.replace(/\s+/g, ' ').trim() : 'global';
    const declarationHash = hashDeclarationIdentity(normalizedSelector, mediaContext, normalizedBlock);
    if (bundleDeclarationHashes.has(declarationHash)) continue;
    bundleDeclarationHashes.add(declarationHash);

    if (!declarationOwners.has(declarationHash)) {
      declarationOwners.set(declarationHash, {
        selector: normalizedSelector,
        mediaContext,
        normalizedHash: declarationHash,
        normalizedBlock,
        bundles: new Set()
      });
    }

    declarationOwners.get(declarationHash).bundles.add(bundle);
  }

  for (const signature of signatures) {
    const identityKey = `${signature.selector}|${signature.mediaContext}|${signature.declarationBlock}`;
    const hash = crypto.createHash('sha256').update(identityKey).digest('hex');

    if (!declarationIdentityOwners.has(hash)) {
      declarationIdentityOwners.set(hash, {
        selector: signature.selector,
        mediaContext: signature.mediaContext,
        bundles: new Set()
      });
    }

    declarationIdentityOwners.get(hash).bundles.add(bundle);
  }
}

const selectorOverlaps = [...selectorOwners.entries()]
  .map(([selector, owners]) => ({ selector, owners: [...owners].sort() }))
  .filter(({ owners }) => owners.length > 1)
  .sort((a, b) => b.owners.length - a.owners.length || a.selector.localeCompare(b.selector));

const duplicates = [...declarationOwners.values()]
  .map((entry) => ({
    selector: entry.selector,
    mediaContext: entry.mediaContext,
    bundles: [...entry.bundles].sort(),
    normalizedHash: entry.normalizedHash
  }))
  .filter((entry) => entry.bundles.length > 1)
  .sort((a, b) => b.bundles.length - a.bundles.length || a.selector.localeCompare(b.selector));

const report = {
  generatedAtUtc: new Date().toISOString(),
  bundleCount: bundles.length,
  uniqueSelectorCount: selectorOwners.size,
  selectorOverlapCount: selectorOverlaps.length,
  identicalDeclarationDuplicateCount: duplicates.length,
  bundles: bundles.sort((a, b) => a.bundle.localeCompare(b.bundle)),
  duplicates,
  selectorOverlaps
};

const outputPath = path.join(repoRoot, 'artifacts', 'css-duplication-matrix.json');
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log('[integrity] css duplication matrix report written');
