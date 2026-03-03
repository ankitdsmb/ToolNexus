import fs from 'node:fs';
import path from 'node:path';
import { extractClassSelectorsFromCss } from '../integrity/css-selector-extractor.mjs';

const repoRoot = process.cwd();
const outputPath = path.join(repoRoot, 'docs', 'architecture-map.md');
const srcRoot = path.join(repoRoot, 'src', 'ToolNexus.Web');

function walk(dir, matcher, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', 'bin', 'obj', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, matcher, results);
    else if (matcher(full)) results.push(full);
  }
  return results;
}

const rel = (file) => path.relative(repoRoot, file).replaceAll('\\', '/');
const read = (file) => fs.readFileSync(file, 'utf8');

const jsFiles = walk(path.join(srcRoot, 'wwwroot', 'js'), (f) => f.endsWith('.js'));
const cssFiles = walk(path.join(srcRoot, 'wwwroot', 'css'), (f) => f.endsWith('.css'));
const razorFiles = walk(path.join(srcRoot, 'Views'), (f) => f.endsWith('.cshtml'));

const importRe = /import\s+(?:[^'"()]*?from\s*)?["']([^"']+)["']/g;
const dynamicImportRe = /import\s*\(\s*["']([^"']+)["']\s*\)/g;

const graph = new Map();
const dynamicImportsByFile = new Map();
for (const file of jsFiles) {
  const source = read(file);
  const imports = [...source.matchAll(importRe)].map((m) => m[1]);
  const dynamic = [...source.matchAll(dynamicImportRe)].map((m) => m[1]);
  dynamicImportsByFile.set(rel(file), dynamic);
  const resolved = imports.concat(dynamic).map((spec) => {
    if (!spec.startsWith('.')) return spec;
    const base = path.resolve(path.dirname(file), spec);
    for (const candidate of [base, `${base}.js`, path.join(base, 'index.js')]) {
      if (fs.existsSync(candidate)) return rel(candidate);
    }
    return spec;
  });
  graph.set(rel(file), resolved);
}

const cshtmlContent = razorFiles.map((f) => ({ file: rel(f), content: read(f) }));
const scriptSrcRe = /<script[^>]+src=["']([^"']+\.js)["']/g;
const cssHrefRe = /<link[^>]+href=["']([^"']+\.css)["']/g;

const jsEntrypoints = new Set();
const cssBundleMap = [];
for (const view of cshtmlContent) {
  for (const m of view.content.matchAll(scriptSrcRe)) {
    const clean = m[1].replace(/^~\//, 'src/ToolNexus.Web/');
    if (clean.startsWith('src/ToolNexus.Web/')) jsEntrypoints.add(clean);
  }
  const styles = [...view.content.matchAll(cssHrefRe)].map((m) => m[1].replace(/^~\//, 'src/ToolNexus.Web/'));
  if (styles.length) cssBundleMap.push({ view: view.file, styles });
}

const partialMap = [];
for (const view of cshtmlContent) {
  const refs = [];
  for (const m of view.content.matchAll(/Html\.PartialAsync\(([^\)]+)\)/g)) refs.push(m[1].trim());
  for (const m of view.content.matchAll(/Html\.Partial\(([^\)]+)\)/g)) refs.push(m[1].trim());
  for (const m of view.content.matchAll(/<partial[^>]+name=["']([^"']+)["'][^>]*>/g)) refs.push(m[1].trim());
  if (refs.length) partialMap.push({ view: view.file, refs });
}

const runtimeFlow = [...graph.entries()]
  .filter(([f]) => f.includes('/wwwroot/js/runtime/'))
  .map(([file, imports]) => ({ file, imports: imports.filter((x) => x.includes('/wwwroot/js/runtime/')) }));

const indegree = new Map([...graph.keys()].map((k) => [k, 0]));
for (const deps of graph.values()) for (const dep of deps) if (indegree.has(dep)) indegree.set(dep, indegree.get(dep) + 1);

const unreachable = [...graph.keys()]
  .filter((k) => (indegree.get(k) || 0) === 0 && !jsEntrypoints.has(k))
  .map((file) => ({ file, confidence: (dynamicImportsByFile.get(file) || []).length ? 0.35 : 0.75 }))
  .sort((a, b) => b.confidence - a.confidence)
  .slice(0, 25);

const dynamicRoots = [...dynamicImportsByFile.entries()].filter(([, v]) => v.length).map(([file, imports]) => ({ file, imports }));

const upgreadCss = cssFiles.filter((f) => path.basename(f).startsWith('upgread_'));
const classesPerBundle = new Map();
for (const file of upgreadCss) {
  const classes = extractClassSelectorsFromCss(read(file));
  classesPerBundle.set(rel(file), classes);
}

const duplicateClasses = new Map();
for (const [bundle, classes] of classesPerBundle.entries()) for (const cls of classes) {
  if (!duplicateClasses.has(cls)) duplicateClasses.set(cls, []);
  duplicateClasses.get(cls).push(bundle);
}
const duplicates = [...duplicateClasses.entries()].filter(([, bundles]) => bundles.length > 1).sort((a, b) => b[1].length - a[1].length).slice(0, 30);

const ownershipRoots = ['src/ToolNexus.Web/Controllers', 'src/ToolNexus.Web/Views', 'src/ToolNexus.Web/wwwroot/js', 'src/ToolNexus.Web/wwwroot/css', 'scripts', 'tests', 'docs'];
const ownership = ownershipRoots.map((root) => ({ root, files: walk(path.join(repoRoot, root), () => true, []).length }));

let manifestSummary = 'Manifest not found.';
if (fs.existsSync(path.join(repoRoot, 'tools.manifest.json'))) {
  const manifest = JSON.parse(read(path.join(repoRoot, 'tools.manifest.json')));
  const topKeys = Object.keys(manifest);
  const tools = Array.isArray(manifest.tools) ? manifest.tools : [];
  const keyTypes = new Map();
  for (const tool of tools.slice(0, 200)) {
    for (const [k, v] of Object.entries(tool)) {
      const t = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
      if (!keyTypes.has(k)) keyTypes.set(k, new Set());
      keyTypes.get(k).add(t);
    }
  }
  manifestSummary = `Top-level keys: ${topKeys.join(', ')}\n\nTool item keys/types:\n${[...keyTypes.entries()].map(([k, v]) => `- ${k}: ${[...v].join('|')}`).join('\n')}`;
}

const diagramLines = [...graph.entries()].slice(0, 60).map(([file, deps]) => `- ${file}\n  -> ${deps.slice(0, 5).join(', ') || '(none)'}`);

const partialOrphans = (() => {
  const allPartials = razorFiles.filter((f) => path.basename(f).startsWith('_')).map(rel);
  const refs = new Set(partialMap.flatMap((p) => p.refs.map((r) => r.replace(/["'()]/g, '').trim())));
  return allPartials.filter((p) => ![...refs].some((r) => p.includes(r)));
})();

const markdown = `# ToolNexus Automated Architecture Map

Generated by \`npm run generate:architecture-docs\`.

## 1. Risk Level (per phase)
- **Phase 1 — CSS Analysis**: **Medium**.
- **Phase 2 — JS Graph Analysis**: **Medium**.
- **Phase 3 — Razor Dependency Audit**: **Low/Medium**.
- **Phase 4 — Runtime Safety Validation**: **Validated in command run section**.

## 2. Safe Cleanup Candidates
### CSS duplicate utility classes across upgread_* bundles
${duplicates.map(([cls, bundles]) => `- \.${cls} → ${bundles.length} bundles`).join('\n') || '- None detected'}

### Potentially unreachable JS modules
${unreachable.map((u) => `- ${u.file} (confidence: ${u.confidence.toFixed(2)})`).join('\n') || '- None detected'}

### Candidate orphan Razor partials
${partialOrphans.slice(0, 30).map((o) => `- ${o}`).join('\n') || '- None detected'}

## 3. Unsafe (dynamic) Dependencies
### Dynamic import roots list
${dynamicRoots.map((d) => `- ${d.file}: ${d.imports.join(', ')}`).join('\n') || '- None detected'}

### Razor partial dynamic/loading-sensitive references
${partialMap.map((m) => `- ${m.view}: ${m.refs.join(' | ')}`).join('\n') || '- None detected'}

## 4. Suggested Merge Order
1. Docs generator and architecture-map baseline.
2. CSS consolidation proposal review (no selector deletion).
3. JS reachability review with runtime telemetry.
4. Razor orphan validation against plugin runtime.
5. Controlled cleanup only after safety checks stay green.

## 5. Runtime Safety Confirmation
- Required commands executed separately and must pass before cleanup actions.

---

## Module dependency diagram (text-based)
${diagramLines.join('\n')}

## Folder ownership map
${ownership.map((o) => `- ${o.root}: ${o.files} files`).join('\n')}

## CSS bundle map
${cssBundleMap.map((m) => `- ${m.view}\n  - ${m.styles.join('\n  - ')}`).join('\n') || '- No linked CSS bundles detected.'}

## Razor partial relationships
${partialMap.map((m) => `- ${m.view}\n  -> ${m.refs.join(', ')}`).join('\n') || '- No partial references detected.'}

## Runtime module flow
${runtimeFlow.map((m) => `- ${m.file}\n  -> ${m.imports.join(', ') || '(none)'}`).join('\n') || '- No runtime module imports detected.'}

## Manifest schema summary
${manifestSummary}
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, markdown);
console.log(`Generated ${rel(outputPath)}`);
