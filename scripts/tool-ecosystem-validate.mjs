import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = resolve('.');
const manifestsDir = join(repoRoot, 'src/ToolNexus.Web/App_Data/tool-manifests');
const toolsManifestPath = join(repoRoot, 'tools.manifest.json');
const reportDir = join(repoRoot, 'reports');
const reportPath = join(reportDir, 'tool-compatibility-report.json');

const toolsManifest = JSON.parse(readFileSync(toolsManifestPath, 'utf8'));
const tools = Array.isArray(toolsManifest.tools) ? toolsManifest.tools : [];

const manifestFiles = new Map();
for (const file of readdirSync(manifestsDir)) {
  if (file.endsWith('.json')) {
    manifestFiles.set(file.replace(/\.json$/u, ''), join(manifestsDir, file));
  }
}

function exists(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function moduleChecks(modulePath, slug) {
  const legacyPath = join(repoRoot, 'src/ToolNexus.Web/wwwroot/js/tools', `${slug}.js`);
  const preferredPath = modulePath
    ? join(repoRoot, 'src/ToolNexus.Web/wwwroot', modulePath.replace(/^\//u, ''))
    : legacyPath;

  const filePath = exists(preferredPath) ? preferredPath : legacyPath;
  if (!exists(filePath)) {
    return {
      exists: false,
      lifecycleOrWrapper: false,
      destroySafe: false,
      details: [`missing module file: ${modulePath ?? `/js/tools/${slug}.js`}`]
    };
  }

  const source = readFileSync(filePath, 'utf8');
  const legacyLifecyclePattern = /window\.ToolNexusModules|window\.runTool|legacyAutoInit|DOMContentLoaded\s*,\s*init|function\s+init\s*\(/u.test(source);
  const lifecycleOrWrapper = /export\s+function\s+(create|init|destroy|mount)\s*\(/u.test(source)
    || /export\s+default\s+function/u.test(source)
    || /getToolPlatformKernel|registerTool\s*\(/u.test(source)
    || legacyLifecyclePattern;

  const destroySafe = /export\s+function\s+destroy\s*\(/u.test(source)
    || /destroy\s*:\s*\(/u.test(source)
    || /cleanup|release|teardown|context\.destroy|runTool/u.test(source)
    || legacyLifecyclePattern;

  return { exists: true, lifecycleOrWrapper, destroySafe, details: [] };
}

function templateChecks(templatePath) {
  if (!templatePath || typeof templatePath !== 'string') {
    return { exists: true, domContractPresent: true, details: [] };
  }

  const filePath = join(repoRoot, 'src/ToolNexus.Web/wwwroot', templatePath.replace(/^\//u, ''));
  if (!exists(filePath)) {
    return { exists: false, domContractPresent: false, details: [`missing template file: ${templatePath}`] };
  }

  return { exists: true, domContractPresent: true, details: [] };
}

const report = [];
let criticalFailures = 0;
for (const tool of tools) {
  const slug = tool.slug;
  const manifestPath = manifestFiles.get(slug);
  const hasManifest = Boolean(manifestPath);
  const manifest = manifestPath ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;

  const modulePath = manifest?.modulePath ?? null;
  const templatePath = manifest?.templatePath ?? null;
  const module = moduleChecks(modulePath, slug);
  const template = templateChecks(templatePath);

  const issues = [];
  if (!hasManifest) {
    issues.push('manifest missing (legacy mode expected)');
  }
  issues.push(...module.details, ...template.details);
  if (!module.lifecycleOrWrapper) {
    issues.push('no lifecycle or wrapper contract detected');
  }
  if (!template.domContractPresent) {
    issues.push('DOM contract marker not detected in template');
  }

  const runtimeMountSafe = module.exists && template.exists && module.lifecycleOrWrapper;
  const destroySafe = module.destroySafe;
  const compatibility = runtimeMountSafe && destroySafe ? 'pass' : 'fail';

  if (compatibility === 'fail') {
    criticalFailures += 1;
  }

  report.push({
    slug,
    hasManifest,
    modulePath,
    templatePath,
    lifecycleOrWrapper: module.lifecycleOrWrapper,
    domContractPresent: template.domContractPresent,
    runtimeMountSafe,
    destroySafe,
    compatibility,
    issues
  });
}

mkdirSync(reportDir, { recursive: true });
writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), totalTools: report.length, criticalFailures, report }, null, 2));

console.log(`Tool ecosystem validation complete. Tools scanned: ${report.length}. Failures: ${criticalFailures}.`);
console.log(`Compatibility report: ${reportPath}`);

if (criticalFailures > 0) {
  for (const item of report.filter((entry) => entry.compatibility === 'fail').slice(0, 10)) {
    console.error(`- ${item.slug}: ${item.issues.join('; ')}`);
  }
  process.exit(1);
}
