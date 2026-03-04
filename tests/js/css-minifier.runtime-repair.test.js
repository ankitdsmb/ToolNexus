import { jest } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { create, destroy, init, runTool } from '../../src/ToolNexus.Web/wwwroot/js/tools/css-minifier.js';
import { createCssMinifierApp } from '../../src/ToolNexus.Web/wwwroot/js/tools/css-minifier.app.js';
import {
  getToolPlatformKernel,
  resetToolPlatformKernelForTesting
} from '../../src/ToolNexus.Web/wwwroot/js/tools/tool-platform-kernel.js';

const TEMPLATE_PATH = path.resolve('src/ToolNexus.Web/wwwroot/tool-templates/css-minifier.html');

function createRoot() {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `<section class="tool-page" data-slug="css-minifier">${fs.readFileSync(TEMPLATE_PATH, 'utf8')}</section>`;
  const root = wrapper.firstElementChild;
  document.body.appendChild(root);
  return root;
}

describe('css-minifier runtime repair coverage', () => {
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

  test('runtime lifecycle exports comply with create/init/destroy contract', () => {
    const root = createRoot();

    const handle = create(root);
    expect(typeof create).toBe('function');
    expect(typeof init).toBe('function');
    expect(typeof destroy).toBe('function');
    expect(typeof runTool).toBe('function');
    expect(getToolPlatformKernel().getLifecycleState('css-minifier', root)).toBe('created');

    handle.init();
    expect(getToolPlatformKernel().getLifecycleState('css-minifier', root)).toBe('initialized');

    destroy(root);
    expect(getToolPlatformKernel().getLifecycleState('css-minifier', root)).toBe('missing');
  });

  test('event handlers are attached for Analyze Website URL and Run buttons', () => {
    const root = createRoot();
    const addEventSpy = jest.spyOn(EventTarget.prototype, 'addEventListener');

    createCssMinifierApp(root);

    expect(addEventSpy).toHaveBeenCalledWith('click', expect.any(Function));

    const runButton = root.querySelector('[data-tool-primary-action]');
    const analyzeButton = root.querySelector('#scanUrlBtn');

    const runButtonHandlerRegistered = addEventSpy.mock.calls.some(
      ([eventName], contextIndex) => eventName === 'click' && addEventSpy.mock.contexts[contextIndex] === runButton
    );
    const analyzeButtonHandlerRegistered = addEventSpy.mock.calls.some(
      ([eventName], contextIndex) => eventName === 'click' && addEventSpy.mock.contexts[contextIndex] === analyzeButton
    );

    expect(runButtonHandlerRegistered).toBe(true);
    expect(analyzeButtonHandlerRegistered).toBe(true);
  });

  test('Run button click triggers runTool executor and updates output', async () => {
    const root = createRoot();
    const executeRunTool = jest.fn().mockResolvedValue('body{color:red}');
    createCssMinifierApp(root, { executeRunTool });

    root.querySelector('#inputEditor').value = 'body { color: red; }';
    root.querySelector('[data-tool-primary-action]').click();

    await Promise.resolve();

    expect(executeRunTool).toHaveBeenCalledWith(
      'minify',
      'body { color: red; }',
      expect.objectContaining({ preserveImportantComments: false })
    );
    expect(root.querySelector('#outputField').value).toBe('body{color:red}');
  });

  test('Analyze Website URL sends POST /api/tools/css/analyze and applies API response to UI', async () => {
    const root = createRoot();
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
            totalCss: 5000,
            usedCss: 3200,
            unusedCss: 1800,
            framework: 'Tailwind CSS',
            artifactId: 'artifact-7'
          }
        })
      });

    global.fetch = fetchMock;
    jest.spyOn(window, 'setTimeout').mockImplementation((callback) => {
      callback();
      return 0;
    });

    createCssMinifierApp(root);

    root.querySelector('#websiteUrlInput').value = 'https://example.com';
    root.querySelector('#scanUrlBtn').click();

    for (let index = 0; index < 12 && fetchMock.mock.calls.length < 2; index += 1) {
      await Promise.resolve();
    }

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/tools/css/analyze',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/tools/css/result/job-123');

    for (let index = 0; index < 8 && !root.querySelector('#outputField').value; index += 1) {
      await Promise.resolve();
    }

    expect(root.querySelector('#outputField').value).toContain('Website scan complete for https://example.com');
    expect(root.querySelector('#cssInsights').textContent).toContain('Framework detected: Tailwind CSS');
  });
});
