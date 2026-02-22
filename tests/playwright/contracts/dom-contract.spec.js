import { test, expect } from '@playwright/test';
import { loadPage } from '../helpers/page-loader.js';
import { expectRequiredSelectors } from '../helpers/selector-validator.js';
import { contractSelectors, pageMatrix } from '../helpers/page-matrix.js';

test.describe('DOM contract validation', () => {
  test('TYPE A home and contact selectors are present', async ({ page }) => {
    await loadPage(page, pageMatrix.typeA.home, { waitForSelector: '#toolSearch' });
    await expectRequiredSelectors(page, contractSelectors.typeA.home, 'TYPE A /');

    await loadPage(page, pageMatrix.typeA.contact, { waitForSelector: '#contactForm' });
    await expectRequiredSelectors(page, contractSelectors.typeA.contact, 'TYPE A /contact-us');
  });

  test('TYPE B tools index and category selectors are present', async ({ page }) => {
    await loadPage(page, pageMatrix.typeB.toolsIndex, { waitForSelector: '#toolsSearchInput' });
    await expectRequiredSelectors(page, contractSelectors.typeB.toolsIndex, 'TYPE B /tools');

    await loadPage(page, pageMatrix.typeB.category, { waitForSelector: '#toolGrid' });
    await expectRequiredSelectors(page, contractSelectors.typeB.category, 'TYPE B /tools/{category}');
  });

  test('TYPE C tool shell runtime selectors and config are present', async ({ page }) => {
    await loadPage(page, pageMatrix.typeC.jsonFormatter, { waitForSelector: '#tool-root' });
    await expectRequiredSelectors(page, contractSelectors.typeC.toolRuntime, 'TYPE C /tools/{slug}');

    const config = await page.evaluate(() => window.ToolNexusConfig);
    expect(config).toBeTruthy();
    expect(config.apiBaseUrl).toBeTruthy();
    expect(config.toolExecutionPathPrefix).toBeTruthy();
    expect(config.runtimeModulePath).toBeTruthy();
    expect(config.tool?.slug).toBeTruthy();
  });
});
