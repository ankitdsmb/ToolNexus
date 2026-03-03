import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();

const reportSources = {
  cssMetrics: [
    'artifacts/css-metrics.json',
    'reports/integrity/css-metrics.json',
    'reports/integrity/css-purge-simulation.json'
  ],
  a11y: [
    'artifacts/a11y-report.json',
    'reports/integrity/a11y-report.json'
  ],
  bundle: [
    'artifacts/bundle-report.json',
    'artifacts/bundle-size.json',
    'reports/integrity/bundle-size.json'
  ],
  runtimeCoverage: [
    'artifacts/runtime-coverage.json',
    'reports/integrity/runtime-coverage.json'
  ],
  manifestValidation: [
    'artifacts/manifest-validation.json',
    'reports/integrity/manifest-validation.json'
  ]
};

async function readFirstJson(paths) {
  for (const relPath of paths) {
    const fullPath = path.join(repoRoot, relPath);
    try {
      const raw = await fs.readFile(fullPath, 'utf8');
      return { data: JSON.parse(raw), path: relPath };
    } catch {
      // Try next candidate path.
    }
  }
  return { data: null, path: null };
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0));
}

function scoreCssRisk(cssReport) {
  if (!cssReport) {
    return { score: 70, details: { reason: 'missing_report', totalRejectedSelectors: 0, totalCssFiles: 0 } };
  }

  if (Array.isArray(cssReport.files)) {
    const totalRejected = cssReport.summary?.totalRejectedSelectors
      ?? cssReport.files.reduce((sum, file) => sum + (file.rejectedSelectorsCount ?? 0), 0);
    const totalFiles = cssReport.summary?.cssFileCount ?? cssReport.files.length;
    const avgRejectedPerFile = totalFiles > 0 ? totalRejected / totalFiles : totalRejected;
    const riskScore = clamp((avgRejectedPerFile * 3) + (totalRejected * 0.02));
    return {
      score: Number(riskScore.toFixed(2)),
      details: { reason: 'purge_simulation', totalRejectedSelectors: totalRejected, totalCssFiles: totalFiles }
    };
  }

  const unusedPercent = cssReport.unusedPercent ?? cssReport.summary?.unusedPercent;
  if (typeof unusedPercent === 'number') {
    return {
      score: clamp(unusedPercent),
      details: { reason: 'unused_percent', totalRejectedSelectors: 0, totalCssFiles: 0 }
    };
  }

  return { score: 50, details: { reason: 'unknown_schema', totalRejectedSelectors: 0, totalCssFiles: 0 } };
}

function scoreJsIntegrity(bundleReport, runtimeCoverageReport, manifestReport) {
  const bundleViolations = bundleReport?.summary?.violationCount ?? bundleReport?.violations?.length ?? 0;
  const manifestViolations = manifestReport?.summary?.violationCount ?? manifestReport?.violations?.length ?? 0;
  const jsTotals = runtimeCoverageReport?.js?.totals ?? { totalBytes: 0, usedBytes: 0 };
  const jsUsageRatio = jsTotals.totalBytes > 0 ? jsTotals.usedBytes / jsTotals.totalBytes : 0;
  const usageScore = clamp(jsUsageRatio * 100);

  const penalty = (bundleViolations * 12) + (manifestViolations * 15);
  const score = clamp((usageScore * 0.65) + 35 - penalty);

  return {
    score: Number(score.toFixed(2)),
    details: {
      jsUsagePercent: Number((jsUsageRatio * 100).toFixed(2)),
      bundleViolations,
      manifestViolations
    }
  };
}

function scoreAccessibility(a11yReport) {
  if (!a11yReport) {
    return { score: 55, details: { reason: 'missing_report', violations: 0 } };
  }

  const violations = a11yReport.summary?.violationCount
    ?? a11yReport.violations?.length
    ?? a11yReport.issues?.length
    ?? 0;

  const passes = a11yReport.summary?.passCount ?? a11yReport.passes ?? 0;
  if (passes > 0 || violations > 0) {
    const passRatio = passes / (passes + violations);
    return {
      score: Number(clamp(passRatio * 100).toFixed(2)),
      details: { reason: 'pass_ratio', violations, passCount: passes }
    };
  }

  const score = clamp(100 - (violations * 10));
  return { score: Number(score.toFixed(2)), details: { reason: 'violation_penalty', violations } };
}

function scorePerformance(bundleReport, runtimeCoverageReport) {
  const bundleViolations = bundleReport?.summary?.violationCount ?? bundleReport?.violations?.length ?? 0;
  const regressedAssets = bundleReport?.summary?.regressedAssets ?? bundleReport?.regressedAssets?.length ?? 0;

  const jsTotals = runtimeCoverageReport?.js?.totals ?? { totalBytes: 0, unusedBytes: 0 };
  const cssTotals = runtimeCoverageReport?.css?.totals ?? { totalBytes: 0, unusedBytes: 0 };

  const jsUnusedRatio = jsTotals.totalBytes > 0 ? jsTotals.unusedBytes / jsTotals.totalBytes : 0;
  const cssUnusedRatio = cssTotals.totalBytes > 0 ? cssTotals.unusedBytes / cssTotals.totalBytes : 0;

  const utilizationScore = clamp(100 - ((jsUnusedRatio * 100 * 0.7) + (cssUnusedRatio * 100 * 0.3)));
  const penalty = (bundleViolations * 12) + (regressedAssets * 4);
  const score = clamp(utilizationScore - penalty);

  return {
    score: Number(score.toFixed(2)),
    details: {
      jsUnusedPercent: Number((jsUnusedRatio * 100).toFixed(2)),
      cssUnusedPercent: Number((cssUnusedRatio * 100).toFixed(2)),
      bundleViolations,
      regressedAssets
    }
  };
}

function computeOverallHealth({ cssRiskScore, jsIntegrityScore, accessibilityScore, performanceScore }) {
  const cssHealth = 100 - cssRiskScore;
  const weighted =
    (cssHealth * 0.2)
    + (jsIntegrityScore * 0.35)
    + (accessibilityScore * 0.2)
    + (performanceScore * 0.25);

  return Number(clamp(weighted).toFixed(2));
}

function printSummaryTable(rows) {
  const headers = ['Metric', 'Score'];
  const tableRows = [headers, ...rows.map(({ metric, score }) => [metric, score.toFixed(2)])];
  const colWidths = [
    Math.max(...tableRows.map((row) => row[0].length)),
    Math.max(...tableRows.map((row) => row[1].length))
  ];

  const line = `| ${'-'.repeat(colWidths[0])} | ${'-'.repeat(colWidths[1])} |`;
  const header = `| ${headers[0].padEnd(colWidths[0])} | ${headers[1].padEnd(colWidths[1])} |`;

  console.log(header);
  console.log(line);
  for (const [metric, score] of tableRows.slice(1)) {
    console.log(`| ${metric.padEnd(colWidths[0])} | ${score.padEnd(colWidths[1])} |`);
  }
}

const cssMetrics = await readFirstJson(reportSources.cssMetrics);
const a11y = await readFirstJson(reportSources.a11y);
const bundle = await readFirstJson(reportSources.bundle);
const runtimeCoverage = await readFirstJson(reportSources.runtimeCoverage);
const manifestValidation = await readFirstJson(reportSources.manifestValidation);

const cssRisk = scoreCssRisk(cssMetrics.data);
const jsIntegrity = scoreJsIntegrity(bundle.data, runtimeCoverage.data, manifestValidation.data);
const accessibility = scoreAccessibility(a11y.data);
const performance = scorePerformance(bundle.data, runtimeCoverage.data);
const overallPlatformHealthScore = computeOverallHealth({
  cssRiskScore: cssRisk.score,
  jsIntegrityScore: jsIntegrity.score,
  accessibilityScore: accessibility.score,
  performanceScore: performance.score
});

const summary = {
  timestampUtc: new Date().toISOString(),
  sourceReports: {
    cssMetrics: cssMetrics.path,
    a11yReport: a11y.path,
    bundleReport: bundle.path,
    runtimeCoverageReport: runtimeCoverage.path,
    manifestValidationReport: manifestValidation.path
  },
  scores: {
    cssRiskScore: cssRisk.score,
    jsIntegrityScore: jsIntegrity.score,
    accessibilityScore: accessibility.score,
    performanceScore: performance.score,
    overallPlatformHealthScore
  },
  scoreDetails: {
    cssRisk: cssRisk.details,
    jsIntegrity: jsIntegrity.details,
    accessibility: accessibility.details,
    performance: performance.details
  },
  missingReports: Object.entries({
    cssMetrics: cssMetrics.path,
    a11yReport: a11y.path,
    bundleReport: bundle.path,
    runtimeCoverageReport: runtimeCoverage.path,
    manifestValidationReport: manifestValidation.path
  })
    .filter(([, reportPath]) => !reportPath)
    .map(([name]) => name)
};

const outputPath = path.join(repoRoot, 'artifacts/governance-summary.json');
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(summary, null, 2) + '\n', 'utf8');

printSummaryTable([
  { metric: 'CSS Risk Score', score: summary.scores.cssRiskScore },
  { metric: 'JS Integrity Score', score: summary.scores.jsIntegrityScore },
  { metric: 'Accessibility Score', score: summary.scores.accessibilityScore },
  { metric: 'Performance Score', score: summary.scores.performanceScore },
  { metric: 'Overall Platform Health', score: summary.scores.overallPlatformHealthScore }
]);

if (summary.missingReports.length > 0) {
  console.warn(`[governance] Missing reports: ${summary.missingReports.join(', ')}`);
}
console.log('[governance] Summary written to artifacts/governance-summary.json');
