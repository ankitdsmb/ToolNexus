import fs from 'node:fs';
import path from 'node:path';

export function discoverToolSlugs() {
  const manifestPath = path.resolve(process.cwd(), 'tools.manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return (manifest.tools ?? []).map((tool) => tool.slug).filter(Boolean);
}
