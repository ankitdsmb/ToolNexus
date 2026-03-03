import fs from 'node:fs/promises';
import { loadConfig, listFiles, writeReport } from './shared.mjs';

const purgeCssModule = await import('purgecss').catch((error) => {
  console.error('[integrity] Failed to load required dependency "purgecss".');
  console.error('[integrity] Install dependencies with `npm ci` and retry.');
  console.error(`[integrity] ${error?.message ?? error}`);
  process.exit(1);
});

const { PurgeCSS } = purgeCssModule;

const config = await loadConfig();
const purgeConfig = config.purgeCss;

const cssFiles = await listFiles(purgeConfig.css);
const contentFiles = await listFiles(purgeConfig.content);

const safelist = {
  standard: purgeConfig.safelist.standard,
  deep: purgeConfig.safelist.deep.map((value) => new RegExp(value)),
  greedy: purgeConfig.safelist.greedy.map((value) => new RegExp(value))
};

const purgeResult = await new PurgeCSS().purge({
  content: contentFiles,
  css: cssFiles,
  safelist,
  rejected: true
});

const files = await Promise.all(purgeResult.map(async (item) => {
  const originalCss = await fs.readFile(item.file, 'utf8');
  const before = originalCss.length;
  const after = item.css.length;
  return {
    file: item.file,
    bytesAfterPurgeSimulation: after,
    bytesBefore: before,
    rejectedSelectorsCount: item.rejected?.length ?? 0,
    rejectedSelectorsSample: (item.rejected ?? []).slice(0, 60)
  };
}));

const report = {
  timestampUtc: new Date().toISOString(),
  summary: {
    cssFileCount: cssFiles.length,
    contentFileCount: contentFiles.length,
    totalRejectedSelectors: files.reduce((sum, file) => sum + file.rejectedSelectorsCount, 0)
  },
  files
};

await writeReport(`${config.reportDir}/css-purge-simulation.json`, report);
console.log('[integrity] css purge simulation report written');
