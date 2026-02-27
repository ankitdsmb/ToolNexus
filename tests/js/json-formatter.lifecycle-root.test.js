import { create, init, destroy } from '../../src/ToolNexus.Web/wwwroot/js/tools/json-formatter.js';
import { resetToolPlatformKernelForTesting, getToolPlatformKernel } from '../../src/ToolNexus.Web/wwwroot/js/tools/tool-platform-kernel.js';

function createJsonFormatterRoot() {
  const root = document.createElement('article');
  root.className = 'tool';
  root.dataset.tool = 'json-formatter';
  root.dataset.toolRoot = '';
  root.innerHTML = `
    <button id="formatBtn" type="button"></button>
    <button id="minifyBtn" type="button"></button>
    <button id="validateBtn" type="button"></button>
    <button id="clearBtn" type="button"></button>
    <button id="copyBtn" type="button"></button>
    <button id="downloadBtn" type="button"></button>
    <select id="indentSizeSelect"><option value="2" selected>2</option></select>
    <input id="sortKeysToggle" type="checkbox" />
    <input id="autoFormatToggle" type="checkbox" />
    <input id="wrapToggle" type="checkbox" />
    <div id="jsonEditor"></div>
    <div id="outputEditor"></div>
    <p id="resultStatus"></p>
    <p id="validationState"></p>
    <p id="perfTime"></p>
    <p id="payloadStats"></p>
    <p id="outputStats"></p>
    <section id="processingIndicator" hidden></section>
    <section id="errorBox" hidden>
      <h2 id="errorTitle"></h2>
      <p id="errorDetail"></p>
      <p id="errorLocation" hidden></p>
    </section>
    <section id="toastRegion"></section>
  `;

  document.body.appendChild(root);
  return root;
}

function installMonacoStub() {
  const createModel = (initialValue = '') => {
    let value = initialValue;
    const listeners = new Set();

    return {
      getValue: () => value,
      setValue: (next) => {
        value = String(next);
        listeners.forEach((listener) => listener());
      },
      onDidChangeContent: (listener) => {
        listeners.add(listener);
        return { dispose: () => listeners.delete(listener) };
      },
      dispose: () => listeners.clear()
    };
  };

  window.require = (deps, callback) => callback();
  window.require.config = () => {};
  window.monaco = {
    MarkerSeverity: { Error: 8 },
    editor: {
      createModel,
      create: () => ({ revealLine: () => {}, updateOptions: () => {}, dispose: () => {} }),
      setModelMarkers: () => {}
    }
  };
}

describe('json-formatter lifecycle root normalization', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.ToolNexusConfig = { jsonExampleInput: '{"hello":"world"}' };
    installMonacoStub();
    resetToolPlatformKernelForTesting();
  });

  afterEach(() => {
    resetToolPlatformKernelForTesting();
    document.body.innerHTML = '';
  });

  test('supports lifecycle context object with root/toolRoot', async () => {
    const root = createJsonFormatterRoot();
    const child = document.createElement('div');
    root.appendChild(child);

    const result = await init({ root: child, toolRoot: root });

    expect(result.mounted).toBe(true);
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(1);

    destroy({ root: child, toolRoot: root });
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(0);
  });

  test('supports existing registered handle context', () => {
    const root = createJsonFormatterRoot();
    const handle = create(root);
    const reused = create({ handle });

    expect(reused).toBe(handle);
  });
});
