import fs from 'node:fs/promises';
import path from 'node:path';

const reportPath = path.join(process.cwd(), 'reports/integrity/static-graph.json');
const runtimeBaselinePath = path.join(process.cwd(), 'artifacts/runtime-telemetry-baseline.json');
const legacyBaselinePath = path.join(process.cwd(), 'artifacts/js-governance-baseline.json');

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function summarize(report) {
  const confidenceScores = report.confidenceScores ?? [];

  const staticUnreachableAndUnused = confidenceScores.filter(
    (module) => module.classification === 'high-confidence-dead'
  ).length;

  const staticUnreachableButUsed = confidenceScores.filter(
    (module) => module.classification === 'protected-dynamic' || module.classification === 'medium-risk'
  ).length;

  return {
    staticUnreachableAndUnused,
    staticUnreachableButUsed,
    moduleCount: report.summary?.moduleCount ?? confidenceScores.length,
    generatedFrom: 'reports/integrity/static-graph.json'
  };
}

function normalizeBaseline(baseline) {
  const threshold = baseline.staticUnreachableAndUnusedThreshold ?? baseline.highConfidenceDeadCount ?? 0;
  const unreachableButUsedBaseline =
    baseline.staticUnreachableButUsedBaseline ??
    baseline.staticUnreachableButUsed ??
    baseline.mediumRiskDeadCount ??
    0;

  return {
    staticUnreachableAndUnusedThreshold: threshold,
    staticUnreachableButUsedBaseline: unreachableButUsedBaseline,
    source: baseline.generatedFrom ?? 'unknown'
  };
}

const report = await readJson(reportPath);
const current = summarize(report);

let baseline;
let baselineSource = runtimeBaselinePath;
try {
  baseline = normalizeBaseline(await readJson(runtimeBaselinePath));
} catch {
  baseline = normalizeBaseline(await readJson(legacyBaselinePath));
  baselineSource = legacyBaselinePath;
}

console.log(
  `[telemetry] Runtime telemetry governance: staticUnreachableAndUnused ${baseline.staticUnreachableAndUnusedThreshold} -> ${current.staticUnreachableAndUnused}, staticUnreachableButUsed ${baseline.staticUnreachableButUsedBaseline} -> ${current.staticUnreachableButUsed}`
);

if (current.staticUnreachableButUsed > baseline.staticUnreachableButUsedBaseline) {
  console.warn(
    `[telemetry] Warning: staticUnreachableButUsed increased by ${
      current.staticUnreachableButUsed - baseline.staticUnreachableButUsedBaseline
    } (${baseline.staticUnreachableButUsedBaseline} -> ${current.staticUnreachableButUsed}).`
  );
}

if (current.staticUnreachableAndUnused > baseline.staticUnreachableAndUnusedThreshold) {
  console.error(
    `[telemetry] staticUnreachableAndUnused exceeds baseline threshold by ${
      current.staticUnreachableAndUnused - baseline.staticUnreachableAndUnusedThreshold
    } (${baseline.staticUnreachableAndUnusedThreshold} -> ${current.staticUnreachableAndUnused}).`
  );
  process.exit(1);
}

await fs.mkdir(path.join(process.cwd(), 'artifacts'), { recursive: true });
await fs.writeFile(
  path.join(process.cwd(), 'artifacts/runtime-telemetry-governance-report.json'),
  `${JSON.stringify(
    {
      current,
      baseline: {
        ...baseline,
        baselineSource
      },
      status: 'pass'
    },
    null,
    2
  )}\n`,
  'utf8'
);

console.log('[telemetry] Runtime telemetry governance policy passed.');
