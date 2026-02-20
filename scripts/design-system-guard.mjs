import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../src/ToolNexus.Web/wwwroot/css', import.meta.url);
const allowedSpacing = new Set(['0px', '1px', '2px', '3px', '4px', '8px', '16px', '24px', '32px', '40px', '48px', '64px']);
const allowedFont = new Set(['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '48px']);
const colorPattern = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;
const pxPattern = /(margin|padding|gap|font-size)[^;]*?(-?\d+px)/g;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      yield* walk(full);
    } else if (full.endsWith('.css')) {
      yield full;
    }
  }
}

const violations = [];
const scopedFiles = new Set(['design-tokens.css','theme.css','ui-system.css']);
for (const file of walk(root.pathname)) {
  if (!scopedFiles.has(file.split('/').pop())) {
    continue;
  }
  const content = readFileSync(file, 'utf8');

  for (const match of content.matchAll(pxPattern)) {
    const [, prop, value] = match;
    const ok = prop === 'font-size' ? allowedFont.has(value) : allowedSpacing.has(value);
    if (!ok && !match[0].includes('var(') && !match[0].includes('clamp(')) {
      violations.push(`${file}: ${prop} uses non-token value ${value}`);
    }
  }

  for (const match of content.matchAll(colorPattern)) {
    const index = match.index ?? 0;
    const chunk = content.slice(Math.max(0, index - 40), index + 40);
    if (!chunk.includes(':root') && !chunk.includes('--color-')) {
      violations.push(`${file}: direct hex color ${match[0]} should use tokens`);
    }
  }
}

if (violations.length > 0) {
  console.error('Design system guard violations found:');
  for (const violation of violations.slice(0, 80)) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Design system guard passed.');
