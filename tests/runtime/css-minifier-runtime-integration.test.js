import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import * as cssMinifierModule from '../../src/ToolNexus.Web/wwwroot/js/tools/css-minifier.js';

const TEMPLATE_PATH = path.resolve('src/ToolNexus.Web/wwwroot/tool-templates/css-minifier.html');

function mountCssMinifierRoot() {
  document.body.innerHTML = `<section class="tool-page" data-slug="css-minifier">${fs.readFileSync(TEMPLATE_PATH, 'utf8')}</section>`;
  return document.querySelector('.tool-page[data-slug="css-minifier"]');
}

describe('css-minifier runtime lifecycle integration', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  test('module exposes lifecycle exports and init attaches click handlers for runtime shell actions', async () => {
    expect(typeof cssMinifierModule.create).toBe('function');
    expect(typeof cssMinifierModule.init).toBe('function');
    expect(typeof cssMinifierModule.destroy).toBe('function');

    const root = mountCssMinifierRoot();
    window.requestAnimationFrame = (callback) => {
      callback(0);
      return 0;
    };

    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ jobId: 'job-42' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'Completed',
          result: { totalCss: 1000, usedCss: 500, framework: 'Custom' }
        })
      });

    vi.stubGlobal('fetch', fetchSpy);
    vi.spyOn(window, 'setTimeout').mockImplementation((callback) => {
      callback();
      return 0;
    });

    cssMinifierModule.init(root);

    const input = root.querySelector('#inputEditor');
    const output = root.querySelector('#outputField');
    const runButton = root.querySelector('#runBtn, [data-tool-primary-action]');
    const scanButton = root.querySelector('#scanUrlBtn');
    const urlInput = root.querySelector('#websiteUrlInput');

    input.value = 'body { color: red; }';
    runButton.click();

    for (let index = 0; index < 8 && !output.value; index += 1) {
      await Promise.resolve();
    }

    expect(output.value).toBe('body{color:red}');

    urlInput.value = 'https://example.com';
    scanButton.click();

    for (let index = 0; index < 12 && fetchSpy.mock.calls.length < 2; index += 1) {
      await Promise.resolve();
    }

    expect(fetchSpy).toHaveBeenCalledWith('/api/tools/css/analyze', expect.any(Object));
  });
});
