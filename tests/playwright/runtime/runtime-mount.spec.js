import { test, expect } from '@playwright/test';
import { loadPage, waitForRuntimeMount } from '../helpers/page-loader.js';
import { pageMatrix } from '../helpers/page-matrix.js';

test.describe('Runtime mount health', () => {
  for (const [name, path] of Object.entries(pageMatrix.typeC)) {
    test(`${name} mounts runtime container and output region`, async ({ page }) => {
      await loadPage(page, path, { waitForSelector: '#tool-root' });
      await waitForRuntimeMount(page);

      const runtimeRoot = page.locator('#tool-root[data-tool-root="true"]');
      await expect(runtimeRoot).toBeVisible();
      await expect(page.locator('[data-tool-output]').first()).toBeVisible();
    });
  }
});
