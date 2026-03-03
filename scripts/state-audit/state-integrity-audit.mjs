import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';

const repoRoot = resolve('.');
const paths = {
  toolsManifest: join(repoRoot, 'tools.manifest.json'),
  appManifests: join(repoRoot, 'src/ToolNexus.Web/App_Data/tool-manifests'),
  templateRoot: join(repoRoot, 'src/ToolNexus.Web/wwwroot/tool-templates'),
  toolsJsRoot: join(repoRoot, 'src/ToolNexus.Web/wwwroot/js/tools'),
  layoutRoot: join(repoRoot, 'src/ToolNexus.Web/Views'),
  jsRoot: join(repoRoot, 'src/ToolNexus.Web/wwwroot/js'),
  reportPath: join(repoRoot, 'artifacts/state-integrity-report.json')
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const jsImportPattern = /import\s*(?:[^'"()]*?from\s*)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/gu;
const explicitToolScriptPattern = /\/js\/tools\/[A-Za-z0-9_./-]+\.js/gu;

const safeReadJson = (filePath) => JSON.parse(readFileSync(filePath, 'utf8'));

const walkFiles = (root, extensionFilter = null) => {
  const stack = [root];
  const files = [];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        stack.push(full);
      } else if (!extensionFilter || extensionFilter.has(extname(full))) {
        files.push(full);
      }
    }
  }

  return files;
};

const toolsManifest = safeReadJson(paths.toolsManifest);
const tools = Array.isArray(toolsManifest.tools) ? toolsManifest.tools : [];

const appManifestFiles = readdirSync(paths.appManifests)
  .filter((file) => file.endsWith('.json'))
  .map((file) => ({
    file,
    slugFromFile: file.replace(/\.json$/u, ''),
    filePath: join(paths.appManifests, file),
    manifest: safeReadJson(join(paths.appManifests, file))
  }));

const templateFiles = readdirSync(paths.templateRoot)
  .filter((file) => file.endsWith('.html'))
  .map((file) => ({
    file,
    slug: file.replace(/\.html$/u, ''),
    filePath: join(paths.templateRoot, file)
  }));

const toolIdentifierDuplicates = [];
const manifestSlugUniqueness = [];
const routeMismatch = [];
const modulePathConvention = [];
const toolsWithoutTemplate = [];
const templatesWithoutTool = [];

const manifestSlugCounts = new Map();
for (const [index, tool] of tools.entries()) {
  const slug = String(tool?.slug ?? '').trim();
  if (!slug) {
    manifestSlugUniqueness.push({ index, issue: 'missing slug' });
    continue;
  }

  manifestSlugCounts.set(slug, (manifestSlugCounts.get(slug) ?? 0) + 1);
}

for (const [slug, count] of manifestSlugCounts.entries()) {
  if (count > 1) {
    manifestSlugUniqueness.push({ slug, occurrences: count });
    toolIdentifierDuplicates.push({ type: 'tools.manifest.slug', value: slug, occurrences: count });
  }
}

const appManifestSlugCounts = new Map();
for (const item of appManifestFiles) {
  const appSlug = String(item.manifest?.slug ?? '').trim();
  if (appSlug) {
    appManifestSlugCounts.set(appSlug, (appManifestSlugCounts.get(appSlug) ?? 0) + 1);
  }

  if (!appSlug || appSlug !== item.slugFromFile) {
    routeMismatch.push({
      tool: item.slugFromFile,
      expectedRoute: `/tools/${item.slugFromFile}`,
      issue: 'app-manifest slug does not match file name',
      file: relative(repoRoot, item.filePath),
      manifestSlug: appSlug || null
    });
  }
}

for (const [slug, count] of appManifestSlugCounts.entries()) {
  if (count > 1) {
    toolIdentifierDuplicates.push({ type: 'app-manifest.slug', value: slug, occurrences: count });
  }
}

const appManifestBySlug = new Map(appManifestFiles.map((item) => [item.slugFromFile, item]));
const manifestToolSlugs = new Set();

for (const tool of tools) {
  const slug = String(tool?.slug ?? '').trim();
  if (!slug) {
    continue;
  }

  manifestToolSlugs.add(slug);

  if (!slugPattern.test(slug)) {
    routeMismatch.push({
      tool: slug,
      expectedRoute: `/tools/${slug}`,
      issue: 'slug violates route naming convention (kebab-case expected)'
    });
  }

  const appManifest = appManifestBySlug.get(slug);
  if (!appManifest) {
    routeMismatch.push({
      tool: slug,
      expectedRoute: `/tools/${slug}`,
      issue: 'missing app-manifest entry for slug'
    });
  }

  const configuredModulePath = typeof tool.modulePath === 'string' ? tool.modulePath.trim() : '';
  const effectiveModulePath = configuredModulePath || `/js/tools/${slug}.js`;
  const modulePathIsValid = effectiveModulePath.startsWith('/js/tools/')
    && effectiveModulePath.endsWith('.js')
    && !effectiveModulePath.includes('..')
    && !effectiveModulePath.includes('//');

  if (!modulePathIsValid) {
    modulePathConvention.push({
      tool: slug,
      modulePath: effectiveModulePath,
      expectedPattern: '/js/tools/<slug>.js',
      issue: 'modulePath is not inside /js/tools or has invalid traversal'
    });
  } else {
    const moduleFileName = effectiveModulePath.split('/').at(-1);
    const expectedFileName = `${slug}.js`;
    if (moduleFileName !== expectedFileName) {
      modulePathConvention.push({
        tool: slug,
        modulePath: effectiveModulePath,
        expectedPattern: `/js/tools/${expectedFileName}`,
        issue: 'module filename does not match slug naming convention'
      });
    }
  }

  const moduleFilePath = join(repoRoot, 'src/ToolNexus.Web/wwwroot', effectiveModulePath.replace(/^\//u, ''));
  if (!statSafe(moduleFilePath)?.isFile()) {
    modulePathConvention.push({
      tool: slug,
      modulePath: effectiveModulePath,
      expectedPattern: `/js/tools/${slug}.js`,
      issue: 'module file missing'
    });
  }

  const configuredTemplatePath = typeof tool.templatePath === 'string' ? tool.templatePath.trim() : '';
  const effectiveTemplatePath = configuredTemplatePath || `/tool-templates/${slug}.html`;
  const templateFilePath = join(repoRoot, 'src/ToolNexus.Web/wwwroot', effectiveTemplatePath.replace(/^\//u, ''));

  if (!statSafe(templateFilePath)?.isFile()) {
    toolsWithoutTemplate.push({ tool: slug, expectedTemplatePath: effectiveTemplatePath });
  }
}

for (const template of templateFiles) {
  if (!manifestToolSlugs.has(template.slug)) {
    templatesWithoutTool.push({
      template: `/tool-templates/${template.file}`,
      inferredSlug: template.slug
    });
  }
}

const allToolJsFiles = walkFiles(paths.toolsJsRoot, new Set(['.js']));
const allToolJsRelPaths = allToolJsFiles.map((file) => relative(repoRoot, file));

const graph = new Map();
for (const file of allToolJsFiles) {
  const source = readFileSync(file, 'utf8');
  const imports = new Set();
  let match;
  while ((match = jsImportPattern.exec(source)) !== null) {
    const specifier = match[1] || match[2] || '';
    if (!specifier.startsWith('.')) {
      continue;
    }
    const resolved = resolve(dirname(file), specifier);
    const candidates = [resolved, `${resolved}.js`, join(resolved, 'index.js')];
    const withinTools = candidates
      .map((candidate) => normalizeIfExists(candidate))
      .find((candidate) => candidate && candidate.startsWith(paths.toolsJsRoot));

    if (withinTools) {
      imports.add(withinTools);
    }
  }
  graph.set(file, imports);
}

const seedFiles = new Set();
for (const tool of tools) {
  const slug = String(tool?.slug ?? '').trim();
  if (!slug) continue;
  const modulePath = (typeof tool.modulePath === 'string' && tool.modulePath.trim())
    ? tool.modulePath.trim()
    : `/js/tools/${slug}.js`;
  const moduleFilePath = join(repoRoot, 'src/ToolNexus.Web/wwwroot', modulePath.replace(/^\//u, ''));
  const normalized = normalizeIfExists(moduleFilePath);
  if (normalized && normalized.startsWith(paths.toolsJsRoot)) {
    seedFiles.add(normalized);
  }
}

const layoutAndJsSources = [
  ...walkFiles(paths.layoutRoot, new Set(['.cshtml'])),
  ...walkFiles(paths.jsRoot, new Set(['.js']))
];

for (const file of layoutAndJsSources) {
  const content = readFileSync(file, 'utf8');
  const refs = content.match(explicitToolScriptPattern) ?? [];
  for (const ref of refs) {
    const abs = join(repoRoot, 'src/ToolNexus.Web/wwwroot', ref.replace(/^\//u, ''));
    const normalized = normalizeIfExists(abs);
    if (normalized && normalized.startsWith(paths.toolsJsRoot)) {
      seedFiles.add(normalized);
    }
  }
}

const reachable = new Set();
const stack = [...seedFiles];
while (stack.length > 0) {
  const current = stack.pop();
  if (!current || reachable.has(current)) continue;
  reachable.add(current);
  for (const dep of graph.get(current) ?? []) {
    if (!reachable.has(dep)) {
      stack.push(dep);
    }
  }
}

const orphanModules = allToolJsFiles
  .filter((file) => !reachable.has(file))
  .map((file) => relative(repoRoot, file))
  .sort((a, b) => a.localeCompare(b));

const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    toolsInManifest: tools.length,
    appManifestFiles: appManifestFiles.length,
    templateFiles: templateFiles.length,
    toolJsFiles: allToolJsRelPaths.length,
    issues: {
      manifestSlugUniqueness: manifestSlugUniqueness.length,
      toolIdentifierDuplicates: toolIdentifierDuplicates.length,
      routeMismatch: routeMismatch.length,
      modulePathConvention: modulePathConvention.length,
      toolsWithoutTemplate: toolsWithoutTemplate.length,
      templatesWithoutTool: templatesWithoutTool.length,
      orphanModules: orphanModules.length
    }
  },
  checks: {
    manifestSlugUniqueness,
    toolIdentifierDuplicates,
    toolToRouteConsistency: routeMismatch,
    modulePathSlugConvention: modulePathConvention,
    toolsWithoutTemplate,
    templatesWithoutTool,
    orphanJsModules: orphanModules
  },
  diagnostics: {
    seedModules: [...seedFiles].map((file) => relative(repoRoot, file)).sort((a, b) => a.localeCompare(b)),
    reachableModules: [...reachable].map((file) => relative(repoRoot, file)).sort((a, b) => a.localeCompare(b))
  }
};

mkdirSync(dirname(paths.reportPath), { recursive: true });
writeFileSync(paths.reportPath, JSON.stringify(report, null, 2));

const issueCount = Object.values(report.summary.issues).reduce((sum, value) => sum + value, 0);
console.log(`State integrity audit generated: ${relative(repoRoot, paths.reportPath)}`);
console.log(`Issues detected: ${issueCount}`);

if (issueCount > 0) {
  process.exitCode = 1;
}

function statSafe(filePath) {
  try {
    return statSync(filePath);
  } catch {
    return null;
  }
}

function normalizeIfExists(filePath) {
  const stat = statSafe(filePath);
  return stat?.isFile() ? resolve(filePath) : null;
}
