import { getKeyboardEventManager } from '../keyboard-event-manager.js';
import { decodeUrlInput } from './decoder.js';
import { toUiError } from './errors.js';
import { createInitialState } from './state.js';
import { COPY_RESET_MS, LARGE_INPUT_THRESHOLD, PROCESSING_YIELD_MS, STATUS } from './constants.js';
import { formatCharCount } from './utils.js';

const APP_INSTANCES = new WeakMap();

function setError(elements, error) {
  const uiError = toUiError(error);
  elements.errorTitle.textContent = uiError.title;
  elements.errorMessage.textContent = uiError.message;
  elements.errorGuidance.textContent = uiError.guidance;
  elements.errorBox.hidden = false;
}

function clearError(elements) {
  elements.errorTitle.textContent = '';
  elements.errorMessage.textContent = '';
  elements.errorGuidance.textContent = '';
  elements.errorBox.hidden = true;
}

function readOptions(elements) {
  return {
    autoDecode: elements.autoDecodeToggle.checked,
    plusAsSpace: elements.plusAsSpaceToggle.checked,
    strictMode: elements.strictModeToggle.checked
  };
}

export function mountUrlDecodeTool(root = document.querySelector('.url-decode-tool')) {
  if (!root) {
    return null;
  }

  if (APP_INSTANCES.has(root)) {
    return APP_INSTANCES.get(root);
  }

  const state = createInitialState();
  const disposers = [];
  const elements = {
    root,
    input: root.querySelector('#urlDecodeInput'),
    output: root.querySelector('#urlDecodeOutput'),
    status: root.querySelector('#urlDecodeStatus'),
    inputCount: root.querySelector('#urlDecodeInputCount'),
    outputCount: root.querySelector('#urlDecodeOutputCount'),
    decodeBtn: root.querySelector('#decodeBtn'),
    clearBtn: root.querySelector('#clearBtn'),
    copyBtn: root.querySelector('#copyBtn'),
    processingIndicator: root.querySelector('#urlDecodeProcessing'),
    errorBox: root.querySelector('#urlDecodeError'),
    errorTitle: root.querySelector('#urlDecodeErrorTitle'),
    errorMessage: root.querySelector('#urlDecodeErrorMessage'),
    errorGuidance: root.querySelector('#urlDecodeErrorGuidance'),
    warningText: root.querySelector('#urlDecodeWarning'),
    autoDecodeToggle: root.querySelector('#autoDecodeToggle'),
    plusAsSpaceToggle: root.querySelector('#plusAsSpaceToggle'),
    strictModeToggle: root.querySelector('#strictModeToggle')
  };

  function on(el, ev, handler) {
    if (!el) return;
    el.addEventListener(ev, handler);
    disposers.push(() => el.removeEventListener(ev, handler));
  }

  function syncUi() {
    elements.inputCount.textContent = formatCharCount(elements.input.value);
    elements.outputCount.textContent = formatCharCount(elements.output.value);

    const noInput = !elements.input.value.length;
    elements.decodeBtn.disabled = noInput || state.busy;
    elements.clearBtn.disabled = noInput || state.busy;
    elements.copyBtn.disabled = !elements.output.value.length || state.busy;
  }

  async function decode() {
    if (state.busy || !elements.input.value.length) {
      return;
    }

    const options = readOptions(elements);
    state.busy = true;
    elements.status.textContent = elements.input.value.length > LARGE_INPUT_THRESHOLD ? STATUS.PROCESSING_LARGE : STATUS.PROCESSING;
    elements.processingIndicator.hidden = false;
    elements.warningText.hidden = true;
    clearError(elements);
    syncUi();

    try {
      if (elements.input.value.length > LARGE_INPUT_THRESHOLD) {
        await new Promise((resolve) => setTimeout(resolve, PROCESSING_YIELD_MS));
      }

      const result = decodeUrlInput(elements.input.value, options);
      elements.output.value = result.output;
      state.output = result.output;
      elements.status.textContent = STATUS.SUCCESS;
      if (result.warnings.length) {
        elements.warningText.textContent = result.warnings[0];
        elements.warningText.hidden = false;
      }
    } catch (error) {
      elements.status.textContent = STATUS.ERROR;
      setError(elements, error);
    } finally {
      state.busy = false;
      elements.processingIndicator.hidden = true;
      syncUi();
    }
  }

  function clearAll() {
    elements.input.value = '';
    elements.output.value = '';
    state.output = '';
    elements.status.textContent = STATUS.CLEARED;
    elements.warningText.hidden = true;
    clearError(elements);
    syncUi();
  }

  async function copyOutput() {
    if (!elements.output.value.length) {
      return;
    }

    await navigator.clipboard.writeText(elements.output.value);
    elements.status.textContent = STATUS.COPY_SUCCESS;
    clearTimeout(state.lastCopyTimer);
    state.lastCopyTimer = window.setTimeout(() => {
      if (!state.busy) {
        elements.status.textContent = STATUS.READY;
      }
    }, COPY_RESET_MS);
  }

  function onInputChanged() {
    syncUi();
    if (elements.autoDecodeToggle.checked && elements.input.value.length) {
      void decode();
    }
  }

  on(elements.decodeBtn, 'click', () => { void decode(); });
  on(elements.clearBtn, 'click', clearAll);
  on(elements.copyBtn, 'click', () => {
    copyOutput().catch(() => {
      elements.status.textContent = STATUS.ERROR;
      setError(elements, new Error('Clipboard unavailable'));
    });
  });

  on(elements.input, 'input', onInputChanged);
  on(elements.autoDecodeToggle, 'change', () => {
    if (elements.autoDecodeToggle.checked && elements.input.value.length) {
      void decode();
    }
  });

  const disposeKeyboard = getKeyboardEventManager().register({
    root,
    onKeydown: (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        void decode();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        clearAll();
      }
    }
  });

  elements.status.textContent = STATUS.READY;
  syncUi();

  const app = {
    destroy() {
      disposeKeyboard?.();
      while (disposers.length) {
        disposers.pop()?.();
      }
      clearTimeout(state.lastCopyTimer);
      APP_INSTANCES.delete(root);
    }
  };

  APP_INSTANCES.set(root, app);
  return app;
}
