import { existsSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pluginDirectory = path.join(repoRoot, 'src', 'ToolNexus.Web', 'Views', 'Tools', 'Plugins');
const contextPlugins = [
  'Overview',
  'Features',
  'QuickStart',
  'Guidance',
  'Examples',
  'UseCases',
  'Faq',
  'RelatedTools'
];

const missing = contextPlugins
  .map((plugin) => ({
    plugin,
    relativePath: `~/Views/Tools/Plugins/_${plugin}Plugin.cshtml`,
    absolutePath: path.join(pluginDirectory, `_${plugin}Plugin.cshtml`)
  }))
  .filter(({ absolutePath }) => !existsSync(absolutePath));

if (missing.length > 0) {
  console.error('❌ Missing plugin partial(s) required by ToolShell contextPlugins:');
  for (const item of missing) {
    console.error(` - ${item.plugin}: ${item.relativePath}`);
  }
  process.exit(1);
}

console.log(`✅ Plugin partial validation passed (${contextPlugins.length} context plugin partials found).`);
