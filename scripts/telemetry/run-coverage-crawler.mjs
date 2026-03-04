import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5000';
const OUTPUT_PATH = path.join(process.cwd(), 'artifacts/runtime-import-observed.json');
const TOOL_LINK_SELECTOR = '[data-tool-card] a, .tool-card a';
const TOOL_SHELL_SELECTOR = '[data-tool-shell]';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function collectToolLinks(page) {
  const links = await page.evaluate((selector) => {
    const anchors = [...document.querySelectorAll(selector)];
    const hrefs = anchors
      .map((anchor) => anchor.getAttribute('href'))
      .filter((href) => typeof href === 'string' && href.length > 0)
      .map((href) => {
        try {
          return new URL(href, window.location.origin).pathname;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return [...new Set(hrefs)];
  }, TOOL_LINK_SELECTOR);

  return links;
}

async function attemptToolInteraction(page) {
  await page.evaluate(() => {
    const textInput = document.querySelector('textarea, input[type="text"]');
    if (textInput) {
      textInput.focus();
      textInput.value = 'ToolNexus runtime telemetry coverage sample input';
      textInput.dispatchEvent(new Event('input', { bubbles: true }));
      textInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const runButton = document.querySelector('[data-run-tool], button[type="submit"], .btn-run, .run-tool');
    if (runButton instanceof HTMLElement && !runButton.hasAttribute('disabled')) {
      runButton.click();
    }
  });

  await sleep(750);
}

async function navigateViaSpa(page, routePath) {
  const clicked = await page.evaluate((targetPath) => {
    const normalize = (value) => {
      try {
        return new URL(value, window.location.origin).pathname;
      } catch {
        return null;
      }
    };

    const anchors = [
      ...document.querySelectorAll('[data-tool-card] a, .tool-card a, a[href^="/"]')
    ];

    for (const anchor of anchors) {
      const href = anchor.getAttribute('href');
      if (!href) continue;
      if (normalize(href) === targetPath) {
        anchor.click();
        return true;
      }
    }

    return false;
  }, routePath);

  if (!clicked) {
    await page.goto(new URL(routePath, BASE_URL).toString(), { waitUntil: 'domcontentloaded' });
  }
}

async function readRuntimeSnapshot(page) {
  const snapshot = await page.evaluate(() => {
    if (typeof window.__runtimeImportSnapshot === 'function') {
      return window.__runtimeImportSnapshot();
    }

    return null;
  });

  if (Array.isArray(snapshot)) {
    return snapshot;
  }

  if (Array.isArray(snapshot?.loadedModules)) {
    return snapshot.loadedModules;
  }

  if (Array.isArray(snapshot?.observedModules)) {
    return snapshot.observedModules;
  }

  return [];
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const visitedRoutes = [];

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('body');

    const toolRoutes = await collectToolLinks(page);

    for (const routePath of toolRoutes) {
      await page.goto(new URL(routePath, BASE_URL).toString(), { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(TOOL_SHELL_SELECTOR, { timeout: 5000 });
      await attemptToolInteraction(page);
      visitedRoutes.push(routePath);
    }

    const spaRoutes = toolRoutes.slice(0, Math.min(3, toolRoutes.length));
    if (spaRoutes.length > 1) {
      await page.goto(new URL(spaRoutes[0], BASE_URL).toString(), { waitUntil: 'domcontentloaded' });

      for (const routePath of spaRoutes.slice(1)) {
        await navigateViaSpa(page, routePath);
        await page.waitForSelector(TOOL_SHELL_SELECTOR, { timeout: 5000 });
        await attemptToolInteraction(page);
      }
    }

    const observedModules = await readRuntimeSnapshot(page);

    const payload = {
      timestamp: new Date().toISOString(),
      observedModules,
      loadedModules: observedModules,
      count: observedModules.length,
      metadata: {
        baseUrl: BASE_URL,
        visitedRoutes
      }
    };

    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

    console.log(`[telemetry] Wrote runtime import snapshot to ${OUTPUT_PATH}`);
  } finally {
    await browser.close();
  }

  const { spawn } = await import('node:child_process');
  const validator = spawn('node', ['scripts/integrity/static-graph-validator.mjs'], {
    cwd: process.cwd(),
    stdio: 'inherit'
  });

  const exitCode = await new Promise((resolve) => {
    validator.on('close', (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    process.exit(exitCode);
  }

  const matrixRaw = await fs.readFile(path.join(process.cwd(), 'artifacts/module-reachability-matrix.json'), 'utf8');
  const matrix = JSON.parse(matrixRaw);
  const summary = matrix.summary ?? {};

  console.log('\nTelemetry Coverage Summary');
  console.log('--------------------------');
  console.log(`Observed Modules: ${summary.runtimeObservedCount ?? 0}`);
  console.log(`Static Reachable: ${summary.staticReachableCount ?? 0}`);
  console.log(`Protected Dynamic Unused: ${summary.protectedButUnusedCount ?? 0}`);
  console.log(`True Dead Candidates: ${summary.trueDeadCandidateCount ?? 0}`);
}

run().catch((error) => {
  console.error('[telemetry] Coverage crawler failed:', error);
  process.exit(1);
});
