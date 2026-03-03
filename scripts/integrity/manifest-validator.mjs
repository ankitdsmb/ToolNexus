import fs from 'node:fs/promises';
import { loadConfig, writeReport, fileExists, toRepoPathFromWebPath } from './shared.mjs';

const config = await loadConfig();
const raw = await fs.readFile(config.manifestPath, 'utf8');
const manifest = JSON.parse(raw);
const tools = Array.isArray(manifest.tools) ? manifest.tools : [];

const violations = [];
const slugSet = new Set();

for (const tool of tools) {
  if (!tool.slug || typeof tool.slug !== 'string') {
    violations.push({ type: 'invalid_slug', tool });
    continue;
  }

  if (slugSet.has(tool.slug)) {
    violations.push({ type: 'duplicate_slug', slug: tool.slug });
  }
  slugSet.add(tool.slug);

  if (tool.modulePath) {
    const moduleRepoPath = toRepoPathFromWebPath(tool.modulePath);
    if (!(await fileExists(moduleRepoPath))) {
      violations.push({ type: 'missing_modulePath_file', slug: tool.slug, modulePath: tool.modulePath });
    }
  }

  const slugCandidates = [
    `src/ToolNexus.Web/wwwroot/js/tools/${tool.slug}.js`,
    `src/ToolNexus.Web/wwwroot/js/tools/${tool.slug}.app.js`,
    `src/ToolNexus.Web/wwwroot/js/tools/${tool.slug}.dom.js`,
    `src/ToolNexus.Web/wwwroot/js/tools/${tool.slug}/index.js`
  ];

  let slugMatch = false;
  for (const candidate of slugCandidates) {
    if (await fileExists(candidate)) {
      slugMatch = true;
      break;
    }
  }

  if (!slugMatch) {
    violations.push({ type: 'missing_slug_module', slug: tool.slug, searched: slugCandidates });
  }
}

const report = {
  timestampUtc: new Date().toISOString(),
  summary: {
    toolCount: tools.length,
    uniqueSlugs: slugSet.size,
    violationCount: violations.length
  },
  violations
};

await writeReport(`${config.reportDir}/manifest-validation.json`, report);

if (violations.length > 0) {
  console.error('[integrity] manifest validation failed. See reports/integrity/manifest-validation.json');
  process.exit(1);
}

console.log('[integrity] manifest validation passed');
