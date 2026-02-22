import { expect } from '@playwright/test';

export async function loadPage(page, path, options = {}) {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(response, `Missing HTTP response for ${path}`).not.toBeNull();
  expect(response.ok(), `Failed to load ${path}: HTTP ${response.status()}`).toBeTruthy();

  await page.waitForLoadState('networkidle');

  if (options.waitForSelector) {
    await page.locator(options.waitForSelector).first().waitFor({ state: 'visible' });
  }

  return response;
}

export async function waitForRuntimeMount(page) {
  await page.locator('#tool-root[data-tool-root="true"]').waitFor({ state: 'visible' });
  await page.locator('[data-tool-output]').first().waitFor({ state: 'visible' });
}
