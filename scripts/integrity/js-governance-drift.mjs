import fs from 'node:fs/promises';
import path from 'node:path';

const reportPath = path.join(process.cwd(), 'reports/integrity/static-graph.json');
const baselinePath = path.join(process.cwd(), 'artifacts/js-governance-baseline.json');

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function summarize(report) {
  const confidenceScores = report.confidenceScores ?? [];

  const highConfidenceDeadCount = confidenceScores.filter((module) => module.classification === 'high').length;
  const mediumRiskDeadCount = confidenceScores.filter((module) => module.classification === 'protected').length;

  return {
    highConfidenceDeadCount,
    mediumRiskDeadCount,
    moduleCount: report.summary?.moduleCount ?? confidenceScores.length,
    generatedFrom: 'reports/integrity/static-graph.json'
  };
}

const report = await readJson(reportPath);
const current = summarize(report);

let baseline;
try {
  baseline = await readJson(baselinePath);
} catch (error) {
  console.error(`[governance] Missing baseline at ${baselinePath}.`);
  console.error('[governance] Add artifacts/js-governance-baseline.json before enforcing drift checks.');
  process.exit(1);
}

const currentHigh = current.highConfidenceDeadCount;
const baselineHigh = baseline.highConfidenceDeadCount ?? 0;
const currentMedium = current.mediumRiskDeadCount;
const baselineMedium = baseline.mediumRiskDeadCount ?? 0;

console.log(`[governance] JS dead-module drift: high ${baselineHigh} -> ${currentHigh}, medium ${baselineMedium} -> ${currentMedium}`);

if (currentMedium > baselineMedium) {
  console.warn(`[governance] Warning: medium-risk unreachable modules increased by ${currentMedium - baselineMedium}.`);
}

if (currentHigh > baselineHigh) {
  console.error(
    `[governance] High-confidence dead modules increased by ${currentHigh - baselineHigh} (${baselineHigh} -> ${currentHigh}).`
  );
  process.exit(1);
}

console.log('[governance] JS governance drift policy passed (no high-confidence dead-module increase).');
