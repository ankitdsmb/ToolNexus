import { jest } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { create, destroy, init } from '../../src/ToolNexus.Web/wwwroot/js/tools/css-minifier.js';
import {
  getToolPlatformKernel,
  resetToolPlatformKernelForTesting
} from '../../src/ToolNexus.Web/wwwroot/js/tools/tool-platform-kernel.js';

const TEMPLATE_PATH = path.resolve('src/ToolNexus.Web/wwwroot/tool-templates/css-minifier.html');

function createCssMinifierRoot() {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `<section class="tool-page" data-slug="css-minifier">${fs.readFileSync(TEMPLATE_PATH, 'utf8')}</section>`;
  const root = wrapper.firstElementChild;
  document.body.appendChild(root);
  return root;
}

describe('css-minifier lifecycle + UI wiring', () => {
  beforeEach(() => {
    window.requestAnimationFrame = (callback) => {
      callback(0);
      return 0;
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
    resetToolPlatformKernelForTesting();
    jest.restoreAllMocks();
  });

  test('module exports create/init/destroy and transitions kernel lifecycle', () => {
    const root = createCssMinifierRoot();

    const handle = create(root);
    expect(typeof create).toBe('function');
    expect(typeof init).toBe('function');
    expect(typeof destroy).toBe('function');
    expect(handle).toBeTruthy();
    expect(getToolPlatformKernel().getLifecycleState('css-minifier', root)).toBe('created');

    handle.init();
    expect(getToolPlatformKernel().getLifecycleState('css-minifier', root)).toBe('initialized');

    destroy(root);
    expect(getToolPlatformKernel().getLifecycleState('css-minifier', root)).toBe('missing');
  });

  test('Run button click executes minifier and updates tool output', async () => {
    const root = createCssMinifierRoot();
    init(root);

    const input = root.querySelector('#inputEditor');
    const output = root.querySelector('#outputField');
    const runButton = root.querySelector('#runBtn, [data-tool-primary-action]');

    input.value = 'body { color: red; }';
    runButton.click();

    for (let index = 0; index < 8 && !output.value; index += 1) {
      await Promise.resolve();
    }

    expect(output.value).toBe('body{color:red}');
  });

  test('Analyze Website URL click triggers API call and updates output + report', async () => {
    const root = createCssMinifierRoot();
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'job-123' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'Completed',
          result: {
            totalCss: 12000,
            usedCss: 7000,
            unusedCss: 5000,
            framework: 'Bootstrap',
            artifactId: 'artifact-7'
          }
        })
      });

    global.fetch = fetchMock;
    jest.spyOn(window, 'setTimeout').mockImplementation((cb) => {
      cb();
      return 0;
    });

    init(root);

    const websiteInput = root.querySelector('#websiteUrlInput');
    const analyzeButton = root.querySelector('#scanUrlBtn');
    websiteInput.value = 'https://example.com';

    analyzeButton.click();

    for (let index = 0; index < 12 && fetchMock.mock.calls.length < 2; index += 1) {
      await Promise.resolve();
    }

    expect(fetchMock).toHaveBeenCalledWith('/api/tools/css/analyze', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/tools/css/result/job-123');

    for (let index = 0; index < 8 && !root.querySelector('#outputField').value; index += 1) {
      await Promise.resolve();
    }

    expect(root.querySelector('#outputField').value).toContain('Website scan complete for https://example.com');
    expect(root.querySelector('#cssInsights')?.textContent).toContain('Framework detected: Bootstrap');
  });
});
