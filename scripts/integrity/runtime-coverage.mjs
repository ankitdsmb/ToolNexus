import { chromium } from 'playwright';
import { loadConfig, writeReport } from './shared.mjs';

const config = await loadConfig();
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? config.playwright.baseUrl;
const routes = config.playwright.routes;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.coverage.startJSCoverage({ resetOnNavigation: false });
await page.coverage.startCSSCoverage({ resetOnNavigation: false });

const navigation = [];
for (const route of routes) {
  const url = new URL(route, baseUrl).toString();
  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  navigation.push({ route, status: response?.status() ?? null });
  await page.waitForTimeout(400);
}

const jsCoverage = await page.coverage.stopJSCoverage();
const cssCoverage = await page.coverage.stopCSSCoverage();
await browser.close();

function summarize(entries) {
  return entries.map((entry) => {
    const totalBytes = entry.text.length;
    const usedBytes = entry.ranges.reduce((sum, range) => sum + (range.end - range.start - 1), 0);
    return {
      url: entry.url,
      totalBytes,
      usedBytes: Math.max(0, usedBytes),
      unusedBytes: Math.max(0, totalBytes - usedBytes),
      usedPercent: totalBytes === 0 ? 0 : Number(((usedBytes / totalBytes) * 100).toFixed(2))
    };
  });
}

const jsSummary = summarize(jsCoverage);
const cssSummary = summarize(cssCoverage);

const report = {
  timestampUtc: new Date().toISOString(),
  baseUrl,
  navigation,
  js: {
    files: jsSummary,
    totals: jsSummary.reduce((acc, f) => {
      acc.totalBytes += f.totalBytes;
      acc.usedBytes += f.usedBytes;
      acc.unusedBytes += f.unusedBytes;
      return acc;
    }, { totalBytes: 0, usedBytes: 0, unusedBytes: 0 })
  },
  css: {
    files: cssSummary,
    totals: cssSummary.reduce((acc, f) => {
      acc.totalBytes += f.totalBytes;
      acc.usedBytes += f.usedBytes;
      acc.unusedBytes += f.unusedBytes;
      return acc;
    }, { totalBytes: 0, usedBytes: 0, unusedBytes: 0 })
  }
};

await writeReport(config.playwright.reportPath, report);
console.log('[integrity] runtime coverage report written to', config.playwright.reportPath);
