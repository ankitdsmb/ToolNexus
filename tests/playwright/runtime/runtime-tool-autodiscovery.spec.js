import { test, expect } from '@playwright/test';
import { loadPage, waitForRuntimeMount } from '../helpers/page-loader.js';
import { assertNoRuntimeConsoleErrors } from '../helpers/console-guard.js';
import { discoverToolSlugs } from '../helpers/tool-discovery.js';

const toolSlugs = discoverToolSlugs();

test.describe('runtime bootstrap across all tools', () => {
  for (const slug of toolSlugs) {
    test(`${slug} boots runtime with DOM contract and no console errors`, async ({ page }) => {
      const verifyNoConsoleErrors = assertNoRuntimeConsoleErrors(page);

      await loadPage(page, `/tools/${slug}`, { waitForSelector: '#tool-root' });
      await waitForRuntimeMount(page);

      await expect(page.locator('#tool-root[data-tool-root="true"]')).toBeVisible();
      await expect(page.locator('[data-tool-input]').first()).toBeVisible();
      await expect(page.locator('[data-tool-output]').first()).toBeVisible();
      await expect(page.locator('[data-tool-actions]').first()).toBeVisible();

      await verifyNoConsoleErrors();
    });
  }
});
