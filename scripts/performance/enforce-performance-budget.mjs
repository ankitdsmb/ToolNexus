import fs from 'node:fs';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const allowMissing = args.has('--allow-missing');

const rootDir = process.cwd();
const budgetsPath = path.join(rootDir, 'scripts/performance/performance-budgets.json');
const metricsPath = process.env.TOOLNEXUS_PERF_METRICS_FILE
  ? path.resolve(process.env.TOOLNEXUS_PERF_METRICS_FILE)
  : path.join(rootDir, 'reports/performance/client-metrics.latest.json');

const budgets = JSON.parse(fs.readFileSync(budgetsPath, 'utf8'));

if (!fs.existsSync(metricsPath)) {
  const message = `[performance-budget] Metrics file not found at ${metricsPath}`;
  if (allowMissing) {
    console.warn(`${message} (allowed in local mode)`);
    process.exit(0);
  }

  console.error(message);
  process.exit(1);
}

const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
const failures = [];

for (const [metricName, threshold] of Object.entries(budgets)) {
  const sample = Number(metrics[metricName]);

  if (!Number.isFinite(sample)) {
    failures.push(`${metricName}: missing numeric value`);
    continue;
  }

  if (sample >= threshold) {
    failures.push(`${metricName}: ${sample} (required < ${threshold})`);
  }
}

if (failures.length > 0) {
  console.error('[performance-budget] Budget check failed:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('[performance-budget] All budgets passed.', {
  metricsFile: metricsPath,
  budgets
});
