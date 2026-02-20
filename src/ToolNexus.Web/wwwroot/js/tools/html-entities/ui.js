import { getKeyboardEventManager } from '../keyboard-event-manager.js';
import { normalizeInput } from './normalization.js';
import { encodeHtmlEntities } from './encoder.js';
import { decodeHtmlEntities } from './decoder.js';
import { ConversionError, toUiError } from './errors.js';

const LARGE_INPUT_THRESHOLD = 200000;
const APP_INSTANCES = new WeakMap();

export function runConversion(mode, input, options) {
  const normalized = normalizeInput(input, {
    trimOuterWhitespace: false,
    preserveFormatting: options.preserveFormatting
  });

  if (!normalized.length) {
    return '';
  }

  if (mode === 'decode') {
    return decodeHtmlEntities(normalized);
  }

  return encodeHtmlEntities(normalized, options);
}

export function mountHtmlEntitiesTool(root = document.querySelector('.html-entities-tool')) {
  if (!root) return null;
  if (APP_INSTANCES.has(root)) return APP_INSTANCES.get(root);

  const state = {
    mode: 'encode',
    busy: false
  };

  const disposers = [];
  const input = root.querySelector('#inputEditor');
  const output = root.querySelector('#outputEditor');
  const convertBtn = root.querySelector('#convertBtn');
  const clearBtn = root.querySelector('#clearBtn');
  const copyBtn = root.querySelector('#copyBtn');
  const statusText = root.querySelector('#statusText');
  const inputStats = root.querySelector('#inputStats');
  const outputStats = root.querySelector('#outputStats');
  const processingIndicator = root.querySelector('#processingIndicator');
  const errorBox = root.querySelector('#errorBox');
  const errorTitle = root.querySelector('#errorTitle');
  const errorMessage = root.querySelector('#errorMessage');
  const errorAction = root.querySelector('#errorAction');

  const controls = {
    autoConvert: root.querySelector('#autoConvertToggle'),
    encodeAll: root.querySelector('#encodeAllToggle'),
    unsafeOnly: root.querySelector('#unsafeOnlyToggle'),
    preferNamed: root.querySelector('#preferNamedToggle'),
    numeric: root.querySelector('#numericToggle'),
    hex: root.querySelector('#hexToggle'),
    preserveFormatting: root.querySelector('#preserveFormattingToggle')
  };

  const modeEncodeBtn = root.querySelector('#modeEncodeBtn');
  const modeDecodeBtn = root.querySelector('#modeDecodeBtn');

  function on(el, ev, fn) {
    if (!el) return;
    el.addEventListener(ev, fn);
    disposers.push(() => el.removeEventListener(ev, fn));
  }

  function getOptions() {
    return {
      encodeAll: controls.encodeAll?.checked ?? false,
      unsafeOnly: controls.unsafeOnly?.checked ?? true,
      preferNamed: controls.preferNamed?.checked ?? true,
      numeric: controls.numeric?.checked ?? false,
      hex: controls.hex?.checked ?? false,
      preserveFormatting: controls.preserveFormatting?.checked ?? true
    };
  }

  function updateStats() {
    inputStats.textContent = `${input.value.length.toLocaleString()} chars`;
    outputStats.textContent = `${output.value.length.toLocaleString()} chars`;
    convertBtn.disabled = !input.value.length || state.busy;
    copyBtn.disabled = !output.value.length || state.busy;
  }

  function setMode(mode) {
    state.mode = mode;
    modeEncodeBtn.classList.toggle('is-active', mode === 'encode');
    modeDecodeBtn.classList.toggle('is-active', mode === 'decode');
    modeEncodeBtn.setAttribute('aria-pressed', mode === 'encode');
    modeDecodeBtn.setAttribute('aria-pressed', mode === 'decode');
    convertBtn.textContent = mode === 'encode' ? 'Encode' : 'Decode';
    const disableEncodingOptions = mode === 'decode';
    Object.entries(controls).forEach(([key, element]) => {
      if (!element) return;
      if (key === 'autoConvert' || key === 'preserveFormatting') return;
      element.disabled = disableEncodingOptions;
    });
  }

  function showError(error) {
    const uiError = toUiError(error, 'Unable to process input.');
    errorTitle.textContent = uiError.title;
    errorMessage.textContent = uiError.message;
    errorAction.textContent = uiError.suggestion;
    errorBox.hidden = false;
    statusText.textContent = 'Error';
  }

  function clearError() {
    errorBox.hidden = true;
    errorTitle.textContent = '';
    errorMessage.textContent = '';
    errorAction.textContent = '';
  }

  async function convert() {
    const source = input.value;
    if (!source.length || state.busy) return;

    state.busy = true;
    clearError();
    processingIndicator.hidden = false;
    statusText.textContent = source.length > LARGE_INPUT_THRESHOLD ? 'Processing large input…' : 'Processing…';
    updateStats();

    try {
      if (source.length > LARGE_INPUT_THRESHOLD) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const result = runConversion(state.mode, source, getOptions());
      output.value = result;
      statusText.textContent = 'Conversion complete';
      updateStats();
    } catch (error) {
      showError(new ConversionError('Conversion error', 'The input could not be converted safely.', 'Check malformed entities and retry.'));
      console.error(error);
    } finally {
      state.busy = false;
      processingIndicator.hidden = true;
      updateStats();
    }
  }

  function clearInput() {
    input.value = '';
    output.value = '';
    clearError();
    statusText.textContent = 'Cleared';
    updateStats();
  }

  async function copyOutput() {
    if (!output.value.length) return;

    await navigator.clipboard.writeText(output.value);
    statusText.textContent = 'Copied output';
  }

  function maybeAutoConvert() {
    if (controls.autoConvert?.checked && input.value.length) {
      void convert();
    }
  }

  on(modeEncodeBtn, 'click', () => setMode('encode'));
  on(modeDecodeBtn, 'click', () => setMode('decode'));
  on(convertBtn, 'click', () => { void convert(); });
  on(clearBtn, 'click', clearInput);
  on(copyBtn, 'click', () => copyOutput().catch(() => showError(new ConversionError('Copy failed', 'Could not access clipboard.', 'Copy manually from output field.'))));

  on(input, 'input', () => {
    updateStats();
    maybeAutoConvert();
  });

  const disposeKeyboard = getKeyboardEventManager().register({
    root,
    onKeydown: (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        void convert();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        clearInput();
      }
    }
  });

  setMode(/&(?:#\d+|#x[\da-fA-F]+|[a-zA-Z]+);/.test(input.value) ? 'decode' : 'encode');
  updateStats();

  const app = {
    destroy() {
      disposeKeyboard?.();
      while (disposers.length) disposers.pop()?.();
      APP_INSTANCES.delete(root);
    }
  };

  APP_INSTANCES.set(root, app);
  return app;
}
