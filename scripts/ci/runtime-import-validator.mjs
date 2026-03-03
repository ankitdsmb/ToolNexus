import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const webRoot = path.join(repoRoot, 'src', 'ToolNexus.Web', 'wwwroot');
const jsRoot = path.join(webRoot, 'js');
const manifestPath = path.join(jsRoot, 'tools.manifest.json');
const allowlistPath = path.join(jsRoot, 'runtime-import-allowlist.json');

function fail(errors) {
  console.error('Runtime Import Integrity: FAIL');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

function readManifest() {
  if (!existsSync(manifestPath)) {
    fail([`Manifest file not found: ${manifestPath}`]);
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    fail([`Manifest JSON parse failure: ${error.message}`]);
  }

  const tools = Array.isArray(parsed) ? parsed : parsed?.tools;
  if (!Array.isArray(tools)) {
    fail(['Manifest structure invalid: expected an array or { tools: [] }.']);
  }

  return tools;
}

function walkJsFiles(rootDir) {
  const files = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split('\n').length;
}

function resolveRelativeImport(importerFile, specifier) {
  const importerDir = path.dirname(importerFile);
  const candidate = path.resolve(importerDir, specifier);

  const possibilities = [candidate];
  if (!path.extname(candidate)) {
    possibilities.push(`${candidate}.js`, `${candidate}.mjs`, path.join(candidate, 'index.js'));
  }

  for (const possible of possibilities) {
    if (existsSync(possible) && statSync(possible).isFile()) {
      return possible;
    }
  }

  return null;
}

const errors = [];
const tools = readManifest();

const slugCounts = new Map();
const modulePathCounts = new Map();
const validatedSlugs = [];
const validatedModulePaths = [];

for (let index = 0; index < tools.length; index += 1) {
  const tool = tools[index] ?? {};
  const slug = tool.slug;
  const modulePath = tool.modulePath;

  if (typeof slug !== 'string' || slug.trim().length === 0) {
    errors.push(`Manifest entry #${index + 1}: slug must be a non-empty string.`);
  } else {
    slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
    validatedSlugs.push(slug);
  }

  const moduleValid =
    typeof modulePath === 'string'
    && modulePath.startsWith('/js/')
    && modulePath.endsWith('.js')
    && !modulePath.includes('..')
    && !modulePath.includes('//')
    && !modulePath.includes('http')
    && !modulePath.includes('https')
    && !modulePath.includes(':');

  if (!moduleValid) {
    errors.push(`Manifest entry #${index + 1}${typeof slug === 'string' ? ` (${slug})` : ''}: invalid modulePath "${String(modulePath)}".`);
  } else {
    modulePathCounts.set(modulePath, (modulePathCounts.get(modulePath) ?? 0) + 1);
    validatedModulePaths.push(modulePath);

    const physicalPath = path.join(webRoot, modulePath.replace(/^\//u, ''));
    if (!existsSync(physicalPath) || !statSync(physicalPath).isFile()) {
      errors.push(`Manifest modulePath target missing: ${modulePath} -> ${physicalPath}`);
    }
  }

  if (typeof slug === 'string' && slug.trim().length > 0) {
    const enhancerPath = path.join(jsRoot, 'tools', `${slug}.js`);
    if (!existsSync(enhancerPath) || !statSync(enhancerPath).isFile()) {
      errors.push(`Slug enhancer missing: ${enhancerPath}`);
    }
  }
}

const duplicateSlugs = [...slugCounts.entries()].filter(([, count]) => count > 1);
if (duplicateSlugs.length > 0) {
  for (const [slug, count] of duplicateSlugs) {
    errors.push(`Duplicate slug detected: "${slug}" appears ${count} times.`);
  }
}

const duplicateModulePaths = [...modulePathCounts.entries()].filter(([, count]) => count > 1);
if (duplicateModulePaths.length > 0) {
  for (const [modulePath, count] of duplicateModulePaths) {
    errors.push(`Duplicate modulePath detected: "${modulePath}" appears ${count} times.`);
  }
}

const jsFiles = walkJsFiles(jsRoot);
const staticImportRegex = /(?:^|\n|\r)\s*import\s+(?:[^'"\n]+?\s+from\s+)?['"](\.\.?\/[^'"\n]+)['"]/g;
const dynamicImportRegex = /import\(\s*(['"])(.*?)\1\s*\)/g;
const dynamicInventory = [];

for (const filePath of jsFiles) {
  const source = readFileSync(filePath, 'utf8');

  for (const match of source.matchAll(staticImportRegex)) {
    const specifier = match[1];
    const resolved = resolveRelativeImport(filePath, specifier);
    if (!resolved) {
      const line = lineNumberAt(source, match.index ?? 0);
      errors.push(`Unresolved static import in ${path.relative(repoRoot, filePath)}:${line} -> ${specifier}`);
    }
  }

  for (const match of source.matchAll(dynamicImportRegex)) {
    const rawSpecifier = match[2] ?? '';
    const line = lineNumberAt(source, match.index ?? 0);
    const relFile = path.relative(repoRoot, filePath);

    if (rawSpecifier.startsWith('./') || rawSpecifier.startsWith('../')) {
      const resolved = resolveRelativeImport(filePath, rawSpecifier);
      if (!resolved) {
        errors.push(`Unresolved dynamic relative import in ${relFile}:${line} -> ${rawSpecifier}`);
      }
      continue;
    }

    if (rawSpecifier === 'modulePath' || rawSpecifier.includes('${slug}')) {
      dynamicInventory.push(`${relFile}:${line} -> import(${match[1]}${rawSpecifier}${match[1]})`);
    }
  }

  const dynamicModulePathPattern = /import\(\s*modulePath\s*\)/g;
  for (const match of source.matchAll(dynamicModulePathPattern)) {
    const line = lineNumberAt(source, match.index ?? 0);
    dynamicInventory.push(`${path.relative(repoRoot, filePath)}:${line} -> import(modulePath)`);
  }

  const dynamicSlugTemplatePattern = /import\(\s*`\.\/tools\/\$\{slug\}\.js`\s*\)/g;
  for (const match of source.matchAll(dynamicSlugTemplatePattern)) {
    const line = lineNumberAt(source, match.index ?? 0);
    dynamicInventory.push(`${path.relative(repoRoot, filePath)}:${line} -> import(\`./tools/\${slug}.js\`)`);
  }
}

if (errors.length > 0) {
  fail(errors);
}

const sortedAllowedModules = [...new Set(validatedModulePaths)].sort((a, b) => a.localeCompare(b));
const sortedAllowedSlugs = [...new Set(validatedSlugs)].sort((a, b) => a.localeCompare(b));
const checksum = createHash('sha256').update(sortedAllowedModules.join('|'), 'utf8').digest('hex');

const artifact = {
  buildId: new Date().toISOString(),
  allowedModules: sortedAllowedModules,
  allowedSlugEnhancers: sortedAllowedSlugs,
  checksum
};

writeFileSync(allowlistPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');

console.log(`✔ Manifest module paths validated (${tools.length} tools)`);
console.log('✔ Slug enhancer targets verified');
console.log('✔ Static relative imports resolved');
console.log('✔ No duplicate slugs detected');
console.log('✔ No duplicate modulePath entries detected');
console.log('✔ Allowlist artifact generated');
console.log(`✔ Dynamic import patterns recorded (${dynamicInventory.length} instances)`);
if (dynamicInventory.length > 0) {
  for (const entry of dynamicInventory) {
    console.log(`  - ${entry}`);
  }
}
console.log('');
console.log('Runtime Import Integrity: PASS');
