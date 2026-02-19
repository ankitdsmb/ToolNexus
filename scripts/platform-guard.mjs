import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const toolsRoot = 'src/ToolNexus.Web/wwwroot/js/tools';

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...walk(full));
      continue;
    }
    if (full.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

const files = walk(toolsRoot).filter((file) => !file.includes('__tests__'))
  .filter((file) => !file.endsWith('tool-platform-kernel.js'))
  .filter((file) => !file.endsWith('keyboard-event-manager.js'));
const violations = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const isKernelized = source.includes('getToolPlatformKernel') || source.includes('registerTool({');

  if (!isKernelized) {
    continue;
  }

  if (/\b(?:document|window)\.addEventListener\((['"])keydown\1/.test(source)) {
    violations.push(`${file}: direct global keydown listener`);
  }

  if (!/export function create\(/.test(source)) {
    violations.push(`${file}: missing exported create(root)`);
  }

  if (!/export function destroy\(/.test(source)) {
    violations.push(`${file}: missing exported destroy()`);
  }
}

if (violations.length > 0) {
  console.error('Platform guard violations found:');
  for (const violation of violations) {
    console.error(` - ${violation}`);
  }
  process.exit(1);
}

console.log(`Platform guard passed for ${files.length} tool scripts.`);
