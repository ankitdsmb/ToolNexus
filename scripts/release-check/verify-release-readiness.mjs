import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..');
const artifactsDir = path.join(repoRoot, 'artifacts');
const reportPath = path.join(artifactsDir, 'release-readiness.json');

function runCommand(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    shell: false
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? ''
  };
}

function checkIntegrityScripts() {
  const result = runCommand('node', ['scripts/integrity/ci-enforce.mjs']);
  return {
    name: 'integrityScripts',
    pass: result.status === 0,
    details: 'Runs manifest, static-graph, css-prune, and bundle integrity validators.'
  };
}

function checkProductionConfigMutations() {
  const productionConfigFiles = [
    'src/ToolNexus.Web/appsettings.json',
    'src/ToolNexus.Web/appsettings.Production.json',
    'src/ToolNexus.Web/appsettings.Staging.json'
  ];

  const existingFiles = productionConfigFiles.filter((file) => fs.existsSync(path.join(repoRoot, file)));
  const changedFiles = [];

  for (const file of existingFiles) {
    const unstaged = runCommand('git', ['diff', '--name-only', '--', file], { capture: true });
    const staged = runCommand('git', ['diff', '--cached', '--name-only', '--', file], { capture: true });
    if (unstaged.stdout.trim() || staged.stdout.trim()) {
      changedFiles.push(file);
    }
  }

  return {
    name: 'productionConfigMutation',
    pass: changedFiles.length === 0,
    details: changedFiles.length === 0
      ? 'No mutations detected in production config files.'
      : `Mutated production config files: ${changedFiles.join(', ')}`
  };
}

function checkSecurityHeadersEnabled() {
  const programPath = path.join(repoRoot, 'src/ToolNexus.Web/Program.cs');
  const contents = fs.readFileSync(programPath, 'utf8');
  const hasHsts = contents.includes('app.UseHsts();');
  const hasHttpsRedirect = contents.includes('app.UseHttpsRedirection();');

  return {
    name: 'securityHeadersEnabled',
    pass: hasHsts && hasHttpsRedirect,
    details: hasHsts && hasHttpsRedirect
      ? 'HTTPS redirection and HSTS are configured.'
      : 'Missing security transport middleware (UseHsts and/or UseHttpsRedirection).'
  };
}

function checkDefaultCredentials() {
  const prodPatterns = [
    'src/ToolNexus.Web/appsettings.Production.json',
    'src/ToolNexus.Web/appsettings.Staging.json'
  ];
  const defaultCredentialRegex = /\b(admin|changeme|default|password|123456|qwerty)\b/i;
  const findings = [];

  for (const relPath of prodPatterns) {
    const absPath = path.join(repoRoot, relPath);
    if (!fs.existsSync(absPath)) {
      continue;
    }

    const content = fs.readFileSync(absPath, 'utf8');
    if (defaultCredentialRegex.test(content)) {
      findings.push(relPath);
    }
  }

  return {
    name: 'defaultCredentials',
    pass: findings.length === 0,
    details: findings.length === 0
      ? 'No default credentials detected in production/staging config files.'
      : `Potential default credentials found in: ${findings.join(', ')}`
  };
}

function checkUncommittedMigrations() {
  const migrationPaths = [
    'src/ToolNexus.Infrastructure/Data/Migrations',
    'src/ToolNexus.Infrastructure/Data/IdentityMigrations'
  ];

  const status = runCommand('git', ['status', '--porcelain', '--', ...migrationPaths], { capture: true });
  const changed = status.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    name: 'uncommittedMigrations',
    pass: changed.length === 0,
    details: changed.length === 0
      ? 'No uncommitted migration files detected.'
      : `Uncommitted migration changes detected (${changed.length} file(s)).`
  };
}

function checkBundleBudget() {
  const result = runCommand('node', ['scripts/integrity/bundle-size-regression.mjs']);
  return {
    name: 'bundleSizeBudget',
    pass: result.status === 0,
    details: 'Bundle size regression check completed against configured budget baseline.'
  };
}

const checks = [
  checkIntegrityScripts(),
  checkProductionConfigMutations(),
  checkSecurityHeadersEnabled(),
  checkDefaultCredentials(),
  checkUncommittedMigrations(),
  checkBundleBudget()
];

const passed = checks.every((check) => check.pass);

const report = {
  generatedAt: new Date().toISOString(),
  passed,
  checks
};

fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`\n[release:verify] report written to ${path.relative(repoRoot, reportPath)}`);

for (const check of checks) {
  console.log(`[release:verify] ${check.pass ? 'PASS' : 'FAIL'} - ${check.name}: ${check.details}`);
}

if (!passed) {
  process.exit(1);
}
