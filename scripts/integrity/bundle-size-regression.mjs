import fs from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { loadConfig, listFiles, writeReport } from './shared.mjs';

const config = await loadConfig();
const assets = await listFiles([
  `${config.jsRoot}/**/*.js`,
  `${config.cssRoot}/**/*.css`,
  `!${config.jsRoot}/lib/monaco/**`
]);

const metrics = {};
let totalBytes = 0;
let totalGzipBytes = 0;
for (const asset of assets) {
  const buf = await fs.readFile(asset);
  const bytes = buf.length;
  const gzipBytes = gzipSync(buf, { level: 9 }).length;
  metrics[asset] = { bytes, gzipBytes };
  totalBytes += bytes;
  totalGzipBytes += gzipBytes;
}

let baseline = { assets: {}, totalBytes: 0, totalGzipBytes: 0 };
try {
  baseline = JSON.parse(await fs.readFile(config.bundleBaseline, 'utf8'));
} catch {
  // default baseline
}

const regressedAssets = [];
for (const [file, m] of Object.entries(metrics)) {
  const base = baseline.assets?.[file];
  if (!base) continue;
  if (m.bytes > base.bytes || m.gzipBytes > base.gzipBytes) {
    regressedAssets.push({
      file,
      previous: base,
      current: m,
      deltaBytes: m.bytes - base.bytes,
      deltaGzipBytes: m.gzipBytes - base.gzipBytes
    });
  }
}

const budget = config.bundleBudget;
const violations = [];
if (totalBytes > budget.maxTotalBytes) violations.push({ type: 'total_bytes_budget', totalBytes, max: budget.maxTotalBytes });
if (totalGzipBytes > budget.maxTotalGzipBytes) violations.push({ type: 'total_gzip_budget', totalGzipBytes, max: budget.maxTotalGzipBytes });
if (regressedAssets.length > budget.maxRegressedAssets) {
  violations.push({ type: 'regressed_assets_count', count: regressedAssets.length, max: budget.maxRegressedAssets });
}
for (const item of regressedAssets) {
  if (item.current.bytes > budget.maxAssetBytes || item.current.gzipBytes > budget.maxAssetGzipBytes) {
    violations.push({ type: 'single_asset_budget', file: item.file, bytes: item.current.bytes, gzipBytes: item.current.gzipBytes });
  }
}

const report = {
  timestampUtc: new Date().toISOString(),
  summary: {
    assetCount: assets.length,
    totalBytes,
    totalGzipBytes,
    regressedAssets: regressedAssets.length,
    violationCount: violations.length
  },
  regressedAssets,
  violations,
  assets: metrics
};

await writeReport(`${config.reportDir}/bundle-size.json`, report);

if (process.argv.includes('--write-baseline')) {
  await fs.mkdir(path.dirname(config.bundleBaseline), { recursive: true });
  await fs.writeFile(config.bundleBaseline, JSON.stringify({ generatedAt: new Date().toISOString(), totalBytes, totalGzipBytes, assets: metrics }, null, 2) + '\n');
  console.log('[integrity] baseline updated at', config.bundleBaseline);
}

if (violations.length > 0) {
  console.error('[integrity] bundle size regression failed. See reports/integrity/bundle-size.json');
  process.exit(1);
}

console.log('[integrity] bundle size regression passed');
