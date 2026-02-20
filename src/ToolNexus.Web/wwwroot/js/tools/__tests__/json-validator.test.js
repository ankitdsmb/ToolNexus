import { create, destroy } from '../json-validator/index.js';
import { getKeyboardEventManager, resetKeyboardEventManagerForTesting } from '../keyboard-event-manager.js';
import { getToolPlatformKernel, resetToolPlatformKernelForTesting } from '../tool-platform-kernel.js';

function createJsonValidatorRoot() {
  const root = document.createElement('article');
  root.dataset.jsonValidator = '';
  root.innerHTML = `
    <textarea id="jsonInput"></textarea>
    <textarea id="schemaInput" hidden></textarea>
    <label id="schemaLabel" hidden></label>
    <button id="validateBtn" type="button"></button>
    <button id="formatBtn" type="button"></button>
    <button id="copyBtn" type="button"></button>
    <button id="downloadBtn" type="button"></button>
    <button id="clearBtn" type="button"></button>
    <input id="autoValidateToggle" type="checkbox" />
    <input id="strictModeToggle" type="checkbox" />
    <input id="schemaModeToggle" type="checkbox" />
    <input id="treeViewToggle" type="checkbox" />
    <section id="processingIndicator" hidden></section>
    <p id="resultBadge"></p>
    <section id="successBox" hidden><p id="successDetail"></p></section>
    <section id="errorBox" hidden>
      <h2 id="errorTitle"></h2>
      <p id="errorDescription"></p>
      <p id="errorLocation"></p>
    </section>
    <p id="metricTopLevel"></p>
    <p id="metricKeyCount"></p>
    <p id="metricArrayLength"></p>
    <p id="metricDepth"></p>
    <p id="metricCharacters"></p>
    <p id="metricLines"></p>
    <p id="metricPayloadSize"></p>
    <details id="treeViewPanel" hidden><div id="treeViewContent"></div></details>
  `;

  document.body.appendChild(root);
  return root;
}

describe('json-validator kernel migration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();
  });

  afterEach(() => {
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();
    document.body.innerHTML = '';
  });

  test('idempotent create for the same root', () => {
    const root = createJsonValidatorRoot();

    const first = create(root);
    const second = create(root);

    expect(first).toBe(second);
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(1);
  });

  test('lifecycle cleanup releases keyboard listeners', () => {
    const root = createJsonValidatorRoot();
    const handle = create(root);

    handle.create();
    handle.init();

    const manager = getKeyboardEventManager();
    expect(manager.getRegisteredHandlerCount()).toBe(1);
    expect(manager.getActiveGlobalListenerCount()).toBe(1);

    destroy(root);

    expect(manager.getRegisteredHandlerCount()).toBe(0);
    expect(manager.getActiveGlobalListenerCount()).toBe(0);
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(0);
  });
});
