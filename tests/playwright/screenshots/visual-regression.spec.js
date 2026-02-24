import { test, expect } from '@playwright/test';
import { loadPage, waitForRuntimeMount } from '../helpers/page-loader.js';
import { pageMatrix } from '../helpers/page-matrix.js';

const screenshotTargets = [
  ['type-a-home', pageMatrix.typeA.home],
  ['type-a-about', pageMatrix.typeA.about],
  ['type-a-contact', pageMatrix.typeA.contact],
  ['type-b-tools-index', pageMatrix.typeB.toolsIndex],
  ['type-b-category', pageMatrix.typeB.category],
  ['type-c-json-formatter', pageMatrix.typeC.jsonFormatter],
  ['type-c-base64-encode', pageMatrix.typeC.base64Encode]
];

test.describe('Visual regression snapshots', () => {
  const shouldRunBaseline = process.env.PLAYWRIGHT_ENABLE_VISUAL_BASELINE === 'true';
  for (const [name, path] of screenshotTargets) {
    test(`${name} captures stable visual frame`, async ({ page }) => {
      test.skip(!shouldRunBaseline, 'Visual baselines disabled in this environment (binary snapshot artifacts unsupported).');
      await loadPage(page, path);

      if (path.startsWith('/tools/') && path !== '/tools' && path !== '/tools/json-tools') {
        await waitForRuntimeMount(page);
      }

      const dynamicMasks = [
        page.locator('[data-tool-output]'),
        page.locator('[data-dynamic-stat]')
      ];

      await expect(page).toHaveScreenshot(`${name}.png`, {
        fullPage: true,
        mask: dynamicMasks,
        timeout: 20000
      });
    });
  }
});
