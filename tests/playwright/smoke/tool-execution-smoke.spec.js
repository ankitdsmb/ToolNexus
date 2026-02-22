import { test, expect } from '@playwright/test';
import { loadPage, waitForRuntimeMount } from '../helpers/page-loader.js';
import { pageMatrix } from '../helpers/page-matrix.js';

test('tool execution smoke test: run action renders output', async ({ page }) => {
  await loadPage(page, pageMatrix.typeC.jsonFormatter, { waitForSelector: '#tool-root' });
  await waitForRuntimeMount(page);

  const input = page.locator('[data-tool-input] textarea, [data-tool-input] input, [data-tool-input] [contenteditable="true"]').first();
  await input.fill('{"name":"ToolNexus","valid":true}');

  const runAction = page.locator('[data-tool-actions] button, [data-tool-actions] [role="button"]').first();
  await runAction.click();

  const output = page.locator('[data-tool-output]').first();
  await expect(output).toBeVisible();
  await expect(output).not.toHaveText(/^\s*$/);
});
