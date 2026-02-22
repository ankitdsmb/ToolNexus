import { expect } from '@playwright/test';

export async function expectRequiredSelectors(page, selectors, scopeDescription) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    await expect(locator, `${scopeDescription} missing selector: ${selector}`).toBeVisible();
  }
}
