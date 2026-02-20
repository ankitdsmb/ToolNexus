import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = resolve('.');
const toolsManifest = JSON.parse(readFileSync(join(repoRoot, 'tools.manifest.json'), 'utf8'));
const layout = readFileSync(join(repoRoot, 'src/ToolNexus.Web/Views/Shared/_Layout.cshtml'), 'utf8');
const toolView = readFileSync(join(repoRoot, 'src/ToolNexus.Web/Views/Tools/Tool.cshtml'), 'utf8');
const siteCss = readFileSync(join(repoRoot, 'src/ToolNexus.Web/wwwroot/css/site.css'), 'utf8');
const uiSystemCss = readFileSync(join(repoRoot, 'src/ToolNexus.Web/wwwroot/css/ui-system.css'), 'utf8');
const tokenCss = readFileSync(join(repoRoot, 'src/ToolNexus.Web/wwwroot/css/design-tokens.css'), 'utf8');

const violations = [];

const tools = Array.isArray(toolsManifest.tools) ? toolsManifest.tools : [];
const titles = new Set();
for (const tool of tools) {
  if (!tool.seoTitle || !tool.seoTitle.trim()) {
    violations.push(`${tool.slug}: missing seoTitle`);
  }
  if (!tool.seoDescription || !tool.seoDescription.trim()) {
    violations.push(`${tool.slug}: missing seoDescription`);
  }
  if (titles.has(tool.seoTitle)) {
    violations.push(`${tool.slug}: duplicate seoTitle \"${tool.seoTitle}\"`);
  }
  titles.add(tool.seoTitle);
}

if (!layout.includes('<link rel="canonical"')) {
  violations.push('_Layout.cshtml: canonical link missing');
}
if (!layout.includes('application/ld+json')) {
  violations.push('_Layout.cshtml: JSON-LD schema script missing');
}
if (!toolView.includes('<h1>')) {
  violations.push('Tool.cshtml: missing h1 for page heading order');
}
if (!toolView.includes('id="toolInputHeading"') || !toolView.includes('id="toolOutputHeading"')) {
  violations.push('Tool.cshtml: missing structured heading IDs');
}

for (const [inputId, labelFor] of [['inputEditor', 'for="inputEditor"'], ['outputEditor', 'for="outputEditor"'], ['actionSelect', 'for="actionSelect"']]) {
  if (!toolView.includes(`id="${inputId}"`) || !toolView.includes(labelFor)) {
    violations.push(`Tool.cshtml: label association missing for ${inputId}`);
  }
}

if (!/(:focus-visible|:focus\s*\{)/u.test(siteCss)) {
  violations.push('site.css: focus visibility styles missing');
}
if (!/@media\s*\(/u.test(siteCss)) {
  violations.push('site.css: responsive media queries missing');
}
const colorTokenBaseline = `${siteCss}
${uiSystemCss}
${tokenCss}`;
if (!/--color-(text|foreground|surface)/u.test(colorTokenBaseline)) {
  violations.push('css token baseline: design token color variables missing');
}

if (violations.length > 0) {
  console.error('SEO/A11Y guard violations found:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(`SEO/A11Y guard passed for ${tools.length} tools.`);
