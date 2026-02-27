import { FORMAT_MODE, runJsonFormatter } from './json-formatter.api.js';
import { JSON_FORMATTER_CONFIG } from './json-formatter/constants.js';
import { formatCountSummary } from './json-formatter/utils.js';
import {
  clearErrorState,
  pushToast,
  resolveJsonFormatterDom,
  setErrorState
} from './json-formatter.dom.js';
import { getKeyboardEventManager } from './keyboard-event-manager.js';

let monacoLoadPromise = null;

/* =========================================================
   SAFE SINGLETON MONACO LOADER (REAL FIX)
========================================================= */
function loadMonacoSafe() {
  if (window.monaco?.editor) {
    return Promise.resolve(window.monaco);
  }

  if (monacoLoadPromise) {
    return monacoLoadPromise;
  }

  monacoLoadPromise = new Promise((resolve, reject) => {
    if (typeof window.require !== 'function') {
      reject(new Error('Monaco loader unavailable'));
      return;
    }

    window.require.config({
      paths: {
        vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs'
      }
    });

    window.require(['vs/editor/editor.main'], () => {
      resolve(window.monaco);
    }, reject);
  });

  return monacoLoadPromise;
}

/* ========================================================= */

export function createJsonFormatterApp(root) {
  const dom = resolveJsonFormatterDom(root);

  const state = {
    isBusy: false,
    autoFormatDebounce: null,
    keyboardDispose: () => { },
    inputSubscription: { dispose: () => { } },
    disposers: [],
    inputEditor: null,
    outputEditor: null,
    inputModel: null,
    outputModel: null,
    monaco: null
  };

  const bind = (el, ev, fn) => {
    el?.addEventListener(ev, fn);
    state.disposers.push(() => el?.removeEventListener(ev, fn));
  };

  const createFallbackEditor = (host, { readOnly = false } = {}) => {
    const existing = host?.querySelector(':scope > .json-formatter-fallback-editor');
    const textarea = existing ?? document.createElement('textarea');

    textarea.className = 'json-formatter-fallback-editor';
    textarea.readOnly = readOnly;
    textarea.spellcheck = false;

    if (!existing) host.appendChild(textarea);

    return {
      getValue: () => textarea.value,
      setValue: v => (textarea.value = v ?? ''),
      revealLine: () => { },
      updateOptions: () => { },
      onDidChangeContent: h => {
        textarea.addEventListener('input', h);
        return { dispose: () => textarea.removeEventListener('input', h) };
      },
      dispose: () => { }
    };
  };

  const updateButtons = () => {
    const hasInput = state.inputModel.getValue().trim().length > 0;
    const hasOutput = state.outputModel.getValue().trim().length > 0;

    dom.formatBtn.disabled = state.isBusy || !hasInput;
    dom.minifyBtn.disabled = state.isBusy || !hasInput;
    dom.validateBtn.disabled = state.isBusy || !hasInput;
    dom.clearBtn.disabled = state.isBusy || !hasInput;
    dom.copyBtn.disabled = state.isBusy || !hasOutput;
    dom.downloadBtn.disabled = state.isBusy || !hasOutput;
  };

  const setMarkers = (location, message) => {
    const markers = location
      ? [{
        startLineNumber: location.line,
        endLineNumber: location.line,
        startColumn: location.column,
        endColumn: location.column + 1,
        message,
        severity: state.monaco?.MarkerSeverity?.Error
      }]
      : [];

    if (state.monaco?.editor && state.inputModel) {
      state.monaco.editor.setModelMarkers(
        state.inputModel,
        JSON_FORMATTER_CONFIG.markerOwner,
        markers
      );
    }
  };

  const updateStats = () => {
    dom.payloadStats.textContent = formatCountSummary(state.inputModel.getValue());
    dom.outputStats.textContent = formatCountSummary(state.outputModel.getValue());
    updateButtons();
  };

  const runPipeline = (mode, options = {}) => {
    const started = performance.now();
    state.isBusy = true;
    clearErrorState(dom);

    const raw = state.inputModel.getValue();

    const result = runJsonFormatter(mode, raw, {
      indentSize: Number.parseInt(dom.indentSizeSelect.value, 10) || 2,
      sortKeys: dom.sortKeysToggle.checked
    });

    if (!result.ok) {
      dom.validationState.textContent = 'Invalid JSON';
      setMarkers(result.error.location, result.error.message);
      state.outputModel.setValue('');
      setErrorState(dom, result.error);
    } else {
      dom.validationState.textContent = 'Valid JSON';
      setMarkers(null, '');
      state.outputModel.setValue(result.output);

      if (!options.silent) {
        pushToast(dom,
          mode === FORMAT_MODE.MINIFIED
            ? 'JSON minified.'
            : 'JSON formatted.');
      }
    }

    state.isBusy = false;
    dom.perfTime.textContent =
      `${(performance.now() - started).toFixed(2)} ms`;

    updateStats();
  };

  return {
    async init() {
      if (!dom.jsonEditor || !dom.outputEditor) {
        throw new Error('Editor containers missing.');
      }

      /* ========= MONACO REAL FIX ========= */
      let monacoLoaded = false;

  try {
    state.monaco = await loadMonacoSafe();
    monacoLoaded = Boolean(state.monaco?.editor);
  } catch (e) {
    console.warn('[json-formatter] Monaco unavailable → fallback editor');
  }

      if (monacoLoaded) {
        state.inputModel =
          state.monaco.editor.createModel(
            window.ToolNexusConfig?.jsonExampleInput ?? '',
            'json'
          );

        state.outputModel =
          state.monaco.editor.createModel('', 'json');

        const shared = {
          theme: JSON_FORMATTER_CONFIG.monacoTheme,
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 14
        };

        state.inputEditor =
          state.monaco.editor.create(dom.jsonEditor, {
            ...shared,
            model: state.inputModel
          });

        state.outputEditor =
          state.monaco.editor.create(dom.outputEditor, {
            ...shared,
            model: state.outputModel,
            readOnly: true
          });
      } else {
        state.inputEditor = createFallbackEditor(dom.jsonEditor);
        state.outputEditor = createFallbackEditor(dom.outputEditor, { readOnly: true });
        state.inputModel = state.inputEditor;
        state.outputModel = state.outputEditor;
      }
      /* =================================== */

      const onInputChanged = () => updateStats();

      state.inputSubscription =
        state.inputModel.onDidChangeContent(onInputChanged);

      state.keyboardDispose =
        getKeyboardEventManager().register({
          root,
          onKeydown: e => {
            if (e.ctrlKey && e.key === 'Enter') {
              e.preventDefault();
              runPipeline(FORMAT_MODE.PRETTY);
            }
          }
        });

      updateStats();
      runPipeline(FORMAT_MODE.PRETTY, { silent: true });
    },

    destroy() {
      state.keyboardDispose();
      clearTimeout(state.autoFormatDebounce);
      state.inputSubscription.dispose();
      state.disposers.forEach(d => d());
      state.inputEditor?.dispose?.();
      state.outputEditor?.dispose?.();
      state.inputModel?.dispose?.();
      state.outputModel?.dispose?.();
    }
  };
} 
