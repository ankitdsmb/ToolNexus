import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const outputPath = path.join(repoRoot, 'artifacts/runtime-performance-report.json');

const targetUrl = process.env.TOOLNEXUS_BASE_URL ?? 'http://127.0.0.1:8080';
const report = {
  generatedAt: new Date().toISOString(),
  targetUrl,
  metrics: {
    firstPaintMs: null,
    largestContentfulPaintMs: null,
    timeToInteractiveToolShellMs: null,
    toolSwitchLatencySsrToMountedMs: null,
    cssBlockingTimeMs: null,
    runtimeMountDurationMs: null
  },
  notes: []
};

try {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

  const metrics = await page.evaluate(async () => {
    window.__enableRuntimePerfTelemetry = true;
    window.__toolRuntimePerfLog = [];

    const firstPaint = performance.getEntriesByName('first-paint')[0]?.startTime ?? null;

    let lcpValue = null;
    if (typeof PerformanceObserver === 'function') {
      await new Promise((resolve) => {
        const obs = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const last = entries[entries.length - 1];
          if (last) lcpValue = last.startTime;
        });
        obs.observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => {
          obs.disconnect();
          resolve();
        }, 2000);
      });
    }

    const shellStart = performance.now();
    await new Promise((resolve) => {
      const check = () => {
        const shell = document.querySelector('[data-tool-shell]');
        const host = document.querySelector('[data-tool-content-host], #tool-root');
        if (shell && host) return resolve();
        requestAnimationFrame(check);
      };
      check();
    });
    const tti = performance.now() - shellStart;

    const mountDuration = Array.isArray(window.__toolRuntimePerfLog)
      ? window.__toolRuntimePerfLog.map((x) => Number(x?.mountTimeMs || 0)).filter((x) => Number.isFinite(x)).at(-1) ?? null
      : null;

    const toolSwitchLatency = (() => {
      const nav = performance.getEntriesByType('navigation')[0];
      if (!nav) return null;
      if (!mountDuration) return null;
      return nav.responseEnd + mountDuration;
    })();

    const cssEntries = performance.getEntriesByType('resource').filter((e) => e.initiatorType === 'link' && /\.css/i.test(e.name));
    const cssBlocking = cssEntries.reduce((sum, e) => sum + (e.duration || 0), 0);

    return {
      firstPaintMs: firstPaint,
      largestContentfulPaintMs: lcpValue,
      timeToInteractiveToolShellMs: tti,
      toolSwitchLatencySsrToMountedMs: toolSwitchLatency,
      cssBlockingTimeMs: cssBlocking,
      runtimeMountDurationMs: mountDuration
    };
  });

  report.metrics = metrics;
  await browser.close();
} catch (error) {
  report.notes.push(`Runtime baseline capture unavailable: ${error?.message ?? String(error)}`);
}

await fs.mkdir(path.join(repoRoot, 'artifacts'), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
console.log('Wrote artifacts/runtime-performance-report.json');
