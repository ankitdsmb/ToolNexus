import { access } from 'node:fs/promises';
import path from 'node:path';

const requiredFiles = [
  'editor/editor.worker.js',
  'language/json/json.worker.js',
  'language/css/css.worker.js',
  'language/html/html.worker.js',
  'language/typescript/ts.worker.js'
];

const baseDir = path.resolve('src/ToolNexus.Web/wwwroot/lib/monaco/vs');
const missing = [];

for (const relativeFile of requiredFiles) {
  const target = path.join(baseDir, relativeFile);
  try {
    await access(target);
  } catch {
    missing.push(relativeFile);
  }
}

if (missing.length > 0) {
  console.error('Missing Monaco runtime assets:');
  for (const file of missing) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log('Monaco runtime assets check passed.');
for (const file of requiredFiles) {
  console.log(`- ${path.posix.join('vs', file)}`);
}
