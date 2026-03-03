import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const outputPath = path.join(repoRoot, 'artifacts', 'security-scan-report.json');

const scanRoots = ['src', 'scripts'];
const includeExtensions = new Set(['.cs', '.js', '.mjs', '.ts']);
const ignoreSegments = new Set(['node_modules', 'bin', 'obj', 'dist', '.git']);

async function collectFiles(rootRelative) {
  const rootAbsolute = path.join(repoRoot, rootRelative);
  const files = [];

  async function walk(dirAbsolute) {
    let entries = [];
    try {
      entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryAbsolute = path.join(dirAbsolute, entry.name);
      const entryRelative = path.relative(repoRoot, entryAbsolute).split(path.sep).join('/');
      if (ignoreSegments.has(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(entryAbsolute);
      } else if (entry.isFile() && includeExtensions.has(path.extname(entry.name))) {
        files.push(entryRelative);
      }
    }
  }

  await walk(rootAbsolute);
  return files;
}

const sourceFiles = (await Promise.all(scanRoots.map((root) => collectFiles(root)))).flat();
const findings = [];

function addFinding({ severity, ruleId, file, line, detail, evidence }) {
  findings.push({ severity, ruleId, file, line, detail, evidence });
}

function lineNumberAt(content, index) {
  return content.slice(0, index).split('\n').length;
}

for (const file of sourceFiles) {
  const absolute = path.join(repoRoot, file);
  const content = await fs.readFile(absolute, 'utf8');

  if (file.endsWith('.cs')) {
    const postRegex = /((?:\[[^\]]+\]\s*)*)\[HttpPost(?:\([^\)]*\))?\]/g;
    for (const match of content.matchAll(postRegex)) {
      const attrs = match[1] ?? '';
      const blockStart = match.index ?? 0;
      const blockLine = lineNumberAt(content, blockStart);
      const context = content.slice(Math.max(0, blockStart - 500), Math.min(content.length, blockStart + 500));
      const hasAllowAnonymous = /\[AllowAnonymous\]/.test(attrs) || /\[AllowAnonymous\]/.test(context);
      if (hasAllowAnonymous) {
        addFinding({
          severity: 'Critical',
          ruleId: 'anonymous-post-endpoint',
          file,
          line: blockLine,
          detail: 'HTTP POST endpoint appears to allow anonymous access.',
          evidence: attrs.trim() || '[HttpPost]'
        });
      }
    }

    const controllerRegex = /((?:\[[^\]]+\]\s*)*)(?:public\s+)?(?:sealed\s+)?class\s+(\w+Controller)\b[\s\S]*?\{/g;
    for (const match of content.matchAll(controllerRegex)) {
      const attrs = match[1] ?? '';
      const controllerName = match[2] ?? 'UnknownController';
      const start = match.index ?? 0;
      const header = content.slice(Math.max(0, start - 300), Math.min(content.length, start + 300));
      const isAdminRoute = /admin/i.test(file) || /admin/i.test(controllerName) || /\[Route\([^\)]*admin[^\)]*\)\]/i.test(attrs) || /\[Area\([^\)]*admin[^\)]*\)\]/i.test(attrs) || /admin/i.test(header);
      if (!isAdminRoute) {
        continue;
      }

      const classHasAuthorize = /\[Authorize(?:\([^\)]*\))?\]/.test(attrs);
      if (!classHasAuthorize) {
        addFinding({
          severity: 'High',
          ruleId: 'admin-route-missing-authorize',
          file,
          line: lineNumberAt(content, start),
          detail: 'Potential admin controller without class-level [Authorize] attribute.',
          evidence: controllerName
        });
      }
    }

    const csharpFileWriteRegex = /(File\.(?:WriteAllText|WriteAllTextAsync|WriteAllBytes|WriteAllBytesAsync|AppendAllText|AppendAllTextAsync)|new\s+StreamWriter\s*\()\s*\(([^\n;]+)/g;
    for (const match of content.matchAll(csharpFileWriteRegex)) {
      const call = match[1] ?? '';
      const args = match[2] ?? '';
      const hasLiteralPath = /^\s*@?"[^"]+"\s*,?/.test(args) || /^\s*'[^']+'\s*,?/.test(args);
      if (!hasLiteralPath) {
        addFinding({
          severity: 'Medium',
          ruleId: 'dynamic-file-write',
          file,
          line: lineNumberAt(content, match.index ?? 0),
          detail: 'Dynamic C# file write path detected.',
          evidence: `${call}(${args.trim().slice(0, 160)})`
        });
      }

      if (/manifest/i.test(args) || /tools\.manifest/i.test(args)) {
        addFinding({
          severity: 'High',
          ruleId: 'manifest-autogen-runtime',
          file,
          line: lineNumberAt(content, match.index ?? 0),
          detail: 'Possible runtime manifest write detected.',
          evidence: `${call}(${args.trim().slice(0, 160)})`
        });
      }
    }
  }

  if (/\.(?:js|mjs|ts)$/.test(file)) {
    const jsWriteRegex = /(fs\.(?:writeFile|writeFileSync|appendFile|appendFileSync)|writeFile\s*\()\s*\(([^\n;]+)/g;
    for (const match of content.matchAll(jsWriteRegex)) {
      const call = match[1] ?? '';
      const args = match[2] ?? '';
      const hasLiteralPath = /^\s*['"`][^'"`]+['"`]\s*,?/.test(args);
      if (!hasLiteralPath) {
        addFinding({
          severity: 'Medium',
          ruleId: 'dynamic-file-write',
          file,
          line: lineNumberAt(content, match.index ?? 0),
          detail: 'Dynamic JS file write path detected.',
          evidence: `${call}(${args.trim().slice(0, 160)})`
        });
      }

      if (/manifest/i.test(args) || /tools\.manifest/i.test(args)) {
        addFinding({
          severity: 'High',
          ruleId: 'manifest-autogen-runtime',
          file,
          line: lineNumberAt(content, match.index ?? 0),
          detail: 'Possible runtime manifest write detected.',
          evidence: `${call}(${args.trim().slice(0, 160)})`
        });
      }
    }

    const dynamicImportRegex = /\bimport\s*\(([^\)]+)\)/g;
    for (const match of content.matchAll(dynamicImportRegex)) {
      const expr = (match[1] ?? '').trim();
      const isStaticLiteral = /^['"][^'"]+['"]$/.test(expr);
      addFinding({
        severity: isStaticLiteral ? 'Low' : 'Medium',
        ruleId: 'dynamic-import-usage',
        file,
        line: lineNumberAt(content, match.index ?? 0),
        detail: isStaticLiteral
          ? 'Dynamic import call with static literal (review for lazy-loaded attack surface).'
          : 'Dynamic import call with non-literal expression.',
        evidence: `import(${expr.slice(0, 160)})`
      });
    }
  }
}

const severityCounts = findings.reduce((acc, finding) => {
  acc[finding.severity] = (acc[finding.severity] ?? 0) + 1;
  return acc;
}, { Critical: 0, High: 0, Medium: 0, Low: 0 });

const report = {
  generatedAtUtc: new Date().toISOString(),
  scanner: 'toolnexus-security-scan',
  scope: {
    filesScanned: sourceFiles.length,
    roots: scanRoots
  },
  summary: {
    totalFindings: findings.length,
    bySeverity: severityCounts
  },
  findings
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`[security-scan] scanned ${sourceFiles.length} files`);
console.log(`[security-scan] findings: ${findings.length}`);
console.log(`[security-scan] report: ${path.relative(repoRoot, outputPath)}`);
