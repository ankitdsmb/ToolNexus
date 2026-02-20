import { create, destroy } from '../json-formatter.js';
import { FORMAT_MODE, runJsonFormatter } from '../json-formatter.api.js';
import { getKeyboardEventManager, resetKeyboardEventManagerForTesting } from '../keyboard-event-manager.js';
import { getToolPlatformKernel, resetToolPlatformKernelForTesting } from '../tool-platform-kernel.js';

function createJsonFormatterRoot() {
  const root = document.createElement('article');
  root.className = 'tool';
  root.dataset.tool = 'json-formatter';
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

  const createEditor = () => ({ revealLine: () => {}, updateOptions: () => {}, dispose: () => {} });

  window.require = (deps, callback) => callback();
  window.require.config = () => {};
  window.monaco = {
    MarkerSeverity: { Error: 8 },
    editor: {
      createModel,
      create: createEditor,
      setModelMarkers: () => {}
    }
  };
}

describe('json-formatter kernel migration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.ToolNexusConfig = { jsonExampleInput: '{"hello":"world"}' };
    installMonacoStub();
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();
  });

  afterEach(() => {
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();
    document.body.innerHTML = '';
  });

  test('core logic behavior remains correct', () => {
    const formatted = runJsonFormatter(FORMAT_MODE.PRETTY, '{"b":2,"a":1}', { sortKeys: true, indentSize: 2 });
    expect(formatted.ok).toBe(true);
    expect(formatted.output).toBe('{\n  "a": 1,\n  "b": 2\n}');

    const invalid = runJsonFormatter(FORMAT_MODE.PRETTY, '{ bad json }');
    expect(invalid.ok).toBe(false);
    expect(invalid.error.title).toBe('Invalid JSON');
  });

  test('idempotent create for same root', () => {
    const root = createJsonFormatterRoot();
    const first = create(root);
    const second = create(root);

    expect(first).toBe(second);
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(1);
  });

  test('lifecycle mount and destroy keeps keyboard listeners isolated', async () => {
    const rootA = createJsonFormatterRoot();
    const rootB = createJsonFormatterRoot();

    const handleA = create(rootA);
    handleA.create();
    await handleA.init();

    const handleB = create(rootB);
    handleB.create();
    await handleB.init();

    const manager = getKeyboardEventManager();
    expect(manager.getRegisteredHandlerCount()).toBe(2);
    expect(manager.getActiveGlobalListenerCount()).toBe(1);

    handleA.destroy();
    expect(manager.getRegisteredHandlerCount()).toBe(1);

    destroy(rootB);
    expect(manager.getRegisteredHandlerCount()).toBe(0);
    expect(manager.getActiveGlobalListenerCount()).toBe(0);
  });

  test('remount stress x50 does not leak kernel or keyboard listeners', async () => {
    const manager = getKeyboardEventManager();

    for (let i = 0; i < 50; i += 1) {
      const root = createJsonFormatterRoot();
      const handle = create(root);
      handle.create();
      await handle.init();
      handle.destroy();
      root.remove();
    }

    expect(manager.getRegisteredHandlerCount()).toBe(0);
    expect(manager.getActiveGlobalListenerCount()).toBe(0);
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(0);
  });
});
