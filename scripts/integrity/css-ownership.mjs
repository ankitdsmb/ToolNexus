import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { extractClassSelectorsFromCss, extractSelectorDeclarationsFromCss } from './css-selector-extractor.mjs';

const repoRoot = process.cwd();
const cssRoot = path.join(repoRoot, 'src', 'ToolNexus.Web', 'wwwroot', 'css');
const layerMapPath = path.join(repoRoot, 'artifacts', 'css-layer-map.json');
const OVERRIDE_TAG_RE = /(OVERRIDE\s+LAYER|OWNERSHIP_OVERRIDE)/i;

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

function extractClassRuleTagStats(cssText) {
  const stats = new Map();
  const ruleRe = /((?:\/\*[\s\S]*?\*\/\s*)*)([^{}]+)\{/g;
  const classRe = /\.(-?[_a-zA-Z][a-zA-Z0-9_-]*)/g;

  for (const match of cssText.matchAll(ruleRe)) {
    const comments = match[1] ?? '';
    const header = (match[2] ?? '').trim();
    if (!header || header.startsWith('@')) continue;

    const hasOverrideTag = OVERRIDE_TAG_RE.test(comments);

    for (const classMatch of header.matchAll(classRe)) {
      const selector = classMatch[1];
      if (!stats.has(selector)) stats.set(selector, { count: 0, taggedCount: 0 });
      const entry = stats.get(selector);
      entry.count += 1;
      if (hasOverrideTag) entry.taggedCount += 1;
    }
  }

  return stats;
}

async function readLayerOwnershipMap() {
  try {
    const raw = await fs.readFile(layerMapPath, 'utf8');
    const parsed = JSON.parse(raw);
    const owners = new Map();

    for (const layer of parsed.layers ?? []) {
      const file = layer?.file;
      if (!file || !Array.isArray(layer?.owns)) continue;
      for (const selector of layer.owns) {
        if (!selector || typeof selector !== 'string') continue;
        owners.set(selector.trim(), file);
      }
    }

    return owners;
  } catch {
    return new Map();
  }
}

const cssFiles = (await listCssFiles(cssRoot)).filter((file) => /^upgread[-_].+\.css$/i.test(path.basename(file)));
const ownedSelectorToBundle = await readLayerOwnershipMap();

const bundles = [];
const selectorOwners = new Map();
const declarationOwners = new Map();
const nonOwnerViolations = [];

for (const file of cssFiles) {
  const css = await fs.readFile(file, 'utf8');
  const selectors = [...extractClassSelectorsFromCss(css)].sort();
  const fileName = path.basename(file);
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

  const tagStats = extractClassRuleTagStats(css);
  for (const [selector, ownerBundleName] of ownedSelectorToBundle.entries()) {
    const stats = tagStats.get(selector);
    if (!stats) continue;
    if (fileName === ownerBundleName) continue;
    if (stats.count > stats.taggedCount) {
      nonOwnerViolations.push({
        selector,
        owner: ownerBundleName,
        bundle: fileName,
        untaggedRuleCount: stats.count - stats.taggedCount,
        taggedRuleCount: stats.taggedCount
      });
    }
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
  ownershipGuard: {
    ownershipMapPath: path.relative(repoRoot, layerMapPath).replaceAll('\\', '/'),
    overrideTagPattern: OVERRIDE_TAG_RE.source,
    violationCount: nonOwnerViolations.length,
    violations: nonOwnerViolations.sort((a, b) => a.selector.localeCompare(b.selector) || a.bundle.localeCompare(b.bundle))
  },
  bundles: bundles.sort((a, b) => a.bundle.localeCompare(b.bundle)),
  duplicatesByHash,
  selectorOverlaps
};

const outputPath = path.join(repoRoot, 'artifacts', 'css-duplication-matrix.json');
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

if (nonOwnerViolations.length > 0) {
  console.error('[integrity] css ownership guard failed: selectors found in non-owner bundle without explicit override tag');
  for (const violation of nonOwnerViolations) {
    console.error(
      `  - .${violation.selector} owner=${violation.owner} bundle=${violation.bundle} ` +
        `(untagged=${violation.untaggedRuleCount}, tagged=${violation.taggedRuleCount})`
    );
  }
  process.exitCode = 1;
} else {
  console.log('[integrity] css ownership guard passed');
}

console.log('[integrity] css duplication matrix report written');
