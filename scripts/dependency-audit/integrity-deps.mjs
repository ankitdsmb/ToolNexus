#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const policyPath = path.join(rootDir, 'scripts', 'dependency-audit', 'policy.json');
const outputPath = path.join(rootDir, 'artifacts', 'dependency-report.json');

const severityRank = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

function runJsonNpm(args, fallback) {
  try {
    const raw = execFileSync('npm', args, {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return JSON.parse(raw || '{}');
  } catch (error) {
    const stdout = error.stdout?.toString()?.trim();
    if (stdout) {
      try {
        return JSON.parse(stdout);
      } catch {
        return fallback;
      }
    }

    return fallback;
  }
}

function normalizeLicense(license) {
  if (!license) {
    return 'UNKNOWN';
  }

  if (typeof license === 'string') {
    return license.replace(/[()]/g, '').trim();
  }

  if (typeof license === 'object' && typeof license.type === 'string') {
    return license.type.trim();
  }

  return 'UNKNOWN';
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function getInstalledPackages() {
  const pkgLockPath = path.join(rootDir, 'package-lock.json');
  const lock = readJson(pkgLockPath, {});
  const packages = lock.packages || {};
  const result = [];

  for (const [pkgPath, meta] of Object.entries(packages)) {
    if (!pkgPath || !pkgPath.startsWith('node_modules/')) {
      continue;
    }

    const packageName = pkgPath.replace(/^node_modules\//, '');
    const installedVersion = meta.version || 'UNKNOWN';
    const packageJsonPath = path.join(rootDir, pkgPath, 'package.json');
    const packageJson = readJson(packageJsonPath, {});
    const license = normalizeLicense(packageJson.license || meta.license);

    result.push({
      name: packageName,
      version: installedVersion,
      license
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

function parseMajor(versionString) {
  const cleaned = String(versionString || '').replace(/^[^\d]*/, '');
  const major = Number.parseInt(cleaned.split('.')[0], 10);
  return Number.isFinite(major) ? major : null;
}

function summarizeAudit(auditJson, severityFailAt) {
  const vulnSummary = auditJson.metadata?.vulnerabilities || {};
  const findings = [];

  for (const [name, vuln] of Object.entries(auditJson.vulnerabilities || {})) {
    findings.push({
      package: name,
      severity: vuln.severity || 'unknown',
      via: Array.isArray(vuln.via) ? vuln.via.length : 0,
      title: Array.isArray(vuln.via) ? vuln.via.find((v) => typeof v === 'object')?.title || null : null,
      range: vuln.range || null,
      fixAvailable: vuln.fixAvailable || false
    });
  }

  const failLevel = severityRank[severityFailAt] ?? severityRank.high;
  const hasFailing = findings.some((f) => (severityRank[f.severity] ?? -1) >= failLevel);

  return {
    summary: vulnSummary,
    findings,
    failLevel: severityFailAt,
    fail: hasFailing
  };
}

function summarizeOutdated(outdatedJson, threshold) {
  const drift = [];

  for (const [name, info] of Object.entries(outdatedJson || {})) {
    const currentMajor = parseMajor(info.current);
    const latestMajor = parseMajor(info.latest);
    const majorDrift = currentMajor != null && latestMajor != null ? latestMajor - currentMajor : null;

    drift.push({
      package: name,
      current: info.current,
      wanted: info.wanted,
      latest: info.latest,
      dependencyType: info.type,
      majorDrift
    });
  }

  const violating = drift.filter((d) => (d.majorDrift ?? -1) > threshold);

  return {
    threshold,
    packages: drift,
    violations: violating,
    fail: violating.length > 0
  };
}

function summarizeLicenses(installedPackages, allowedLicenses) {
  const unauthorized = installedPackages.filter((pkg) => {
    if (pkg.license === 'UNKNOWN') {
      return true;
    }

    return !allowedLicenses.some((allowed) => pkg.license.includes(allowed));
  });

  return {
    allowedLicenses,
    packages: installedPackages,
    unauthorized,
    fail: unauthorized.length > 0
  };
}

function summarizeDisallowedPatterns(installedPackages, patterns) {
  const compiled = patterns.map((p) => ({ source: p, regex: new RegExp(p, 'i') }));
  const matches = [];

  for (const dep of installedPackages) {
    for (const pattern of compiled) {
      if (pattern.regex.test(dep.name)) {
        matches.push({
          package: dep.name,
          version: dep.version,
          pattern: pattern.source
        });
      }
    }
  }

  return {
    patterns,
    matches,
    fail: matches.length > 0
  };
}

function main() {
  const policy = readJson(policyPath, {});

  const severityFailAt = process.env.DEP_AUDIT_FAIL_SEVERITY || policy.severityFailAt || 'high';
  const majorVersionDriftThreshold = Number.parseInt(
    process.env.DEP_MAJOR_DRIFT_THRESHOLD || policy.majorVersionDriftThreshold || '1',
    10
  );
  const allowedLicenses = policy.allowedLicenses || [];
  const disallowedPatterns = policy.disallowedDependencyPatterns || [];

  const auditJson = runJsonNpm(['audit', '--json'], {});
  const outdatedJson = runJsonNpm(['outdated', '--json'], {});
  const installedPackages = getInstalledPackages();

  const vulnerability = summarizeAudit(auditJson, severityFailAt);
  const outdated = summarizeOutdated(outdatedJson, majorVersionDriftThreshold);
  const licenses = summarizeLicenses(installedPackages, allowedLicenses);
  const disallowed = summarizeDisallowedPatterns(installedPackages, disallowedPatterns);

  const report = {
    generatedAt: new Date().toISOString(),
    policy: {
      severityFailAt,
      majorVersionDriftThreshold,
      allowedLicenses,
      disallowedPatterns
    },
    checks: {
      vulnerability,
      outdated,
      licenses,
      disallowed
    },
    result: {
      fail: vulnerability.fail || outdated.fail || licenses.fail || disallowed.fail,
      failures: [
        vulnerability.fail ? 'high-severity-vulnerability' : null,
        outdated.fail ? 'major-version-drift-threshold-exceeded' : null,
        licenses.fail ? 'unauthorized-license' : null,
        disallowed.fail ? 'disallowed-dependency-pattern' : null
      ].filter(Boolean)
    }
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');

  if (report.result.fail) {
    console.error(`Dependency integrity failed: ${report.result.failures.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  console.log('Dependency integrity checks passed.');
}

main();
