import crypto from 'node:crypto';
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

function stripComments(value) {
  return value.replace(/\/\*[\s\S]*?\*\//g, '');
}

function collapseWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeMediaContext(header) {
  return collapseWhitespace(header.toLowerCase()) || 'GLOBAL';
}

function splitSelectors(header) {
  return header
    .split(',')
    .map((selector) => collapseWhitespace(selector))
    .filter(Boolean);
}

function splitDeclarations(block) {
  const declarations = [];
  let current = '';
  let inString = false;
  let quote = '';
  let escaped = false;
  let parenDepth = 0;

  for (const char of block) {
    if (inString) {
      current += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        inString = false;
        quote = '';
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      current += char;
      continue;
    }

    if (char === '(') {
      parenDepth += 1;
      current += char;
      continue;
    }

    if (char === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      current += char;
      continue;
    }

    if (char === ';' && parenDepth === 0) {
      declarations.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) declarations.push(current);
  return declarations;
}

function normalizeDeclarationBlock(block) {
  const sanitized = stripComments(block);
  const normalizedDeclarations = splitDeclarations(sanitized)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf(':');
      if (separatorIndex < 0) return null;
      const property = collapseWhitespace(entry.slice(0, separatorIndex).toLowerCase());
      const value = collapseWhitespace(entry.slice(separatorIndex + 1));
      if (!property || !value) return null;
      return `${property}:${value}`;
    })
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return normalizedDeclarations.join(';');
}

function parseCssRules(cssText, currentMediaContext = 'GLOBAL', startIndex = 0) {
  const rules = [];
  let i = startIndex;

  while (i < cssText.length) {
    while (i < cssText.length && /\s/.test(cssText[i])) i += 1;
    if (i >= cssText.length) break;
    if (cssText[i] === '}') {
      return { rules, nextIndex: i + 1 };
    }

    const headerStart = i;
    while (i < cssText.length && cssText[i] !== '{' && cssText[i] !== '}') i += 1;
    if (i >= cssText.length || cssText[i] === '}') {
      if (i < cssText.length && cssText[i] === '}') return { rules, nextIndex: i + 1 };
      break;
    }

    const header = collapseWhitespace(cssText.slice(headerStart, i));
    i += 1; // skip {

    if (!header) {
      const nested = parseCssRules(cssText, currentMediaContext, i);
      i = nested.nextIndex;
      continue;
    }

    if (header.startsWith('@media')) {
      const nestedMediaContext = normalizeMediaContext(header);
      const nested = parseCssRules(cssText, nestedMediaContext, i);
      rules.push(...nested.rules);
      i = nested.nextIndex;
      continue;
    }

    if (header.startsWith('@')) {
      const nested = parseCssRules(cssText, currentMediaContext, i);
      rules.push(...nested.rules);
      i = nested.nextIndex;
      continue;
    }

    const declarationStart = i;
    while (i < cssText.length && cssText[i] !== '}') i += 1;
    const declarationBlock = cssText.slice(declarationStart, i);
    const normalizedDeclarationBlock = normalizeDeclarationBlock(declarationBlock);

    for (const selector of splitSelectors(header)) {
      rules.push({
        selector,
        mediaContext: currentMediaContext,
        normalizedDeclarationBlock
      });
    }

    if (i < cssText.length && cssText[i] === '}') i += 1;
  }

  return { rules, nextIndex: i };
}

const cssFiles = (await listCssFiles(cssRoot)).filter((file) => path.basename(file).startsWith('upgread_'));

const bundles = [];
const selectorOwners = new Map();
const identityMap = new Map();

for (const file of cssFiles) {
  const css = await fs.readFile(file, 'utf8');
  const sanitizedCss = stripComments(css);
  const selectors = [...extractClassSelectorsFromCss(sanitizedCss)].sort();
  const bundle = path.relative(repoRoot, file).replaceAll('\\', '/');
  bundles.push({ bundle, selectorCount: selectors.length, selectors });

  for (const selector of selectors) {
    if (!selectorOwners.has(selector)) selectorOwners.set(selector, []);
    selectorOwners.get(selector).push(bundle);
  }

  const { rules } = parseCssRules(sanitizedCss);
  for (const rule of rules) {
    if (!rule.normalizedDeclarationBlock) continue;

    const identitySource = `${rule.selector}|${rule.mediaContext}|${rule.normalizedDeclarationBlock}`;
    const hash = crypto.createHash('sha256').update(identitySource).digest('hex');

    if (!identityMap.has(hash)) {
      identityMap.set(hash, {
        selector: rule.selector,
        mediaContext: rule.mediaContext,
        hash,
        bundles: new Set()
      });
    }

    identityMap.get(hash).bundles.add(bundle);
  }
}

const selectorOverlapCount = [...selectorOwners.values()].filter((owners) => owners.length > 1).length;

const duplicates = [...identityMap.values()]
  .map((item) => ({
    selector: item.selector,
    mediaContext: item.mediaContext,
    hash: item.hash,
    bundles: [...item.bundles].sort()
  }))
  .filter((item) => item.bundles.length > 1)
  .sort((a, b) => b.bundles.length - a.bundles.length || a.selector.localeCompare(b.selector));

const report = {
  generatedAtUtc: new Date().toISOString(),
  bundleCount: bundles.length,
  uniqueSelectorCount: selectorOwners.size,
  selectorOverlapCount,
  identicalDeclarationDuplicateCount: duplicates.length,
  bundles: bundles.sort((a, b) => a.bundle.localeCompare(b.bundle)),
  duplicates
};

const outputPath = path.join(repoRoot, 'artifacts', 'css-duplication-matrix.json');
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log('[integrity] css duplication matrix report written');
