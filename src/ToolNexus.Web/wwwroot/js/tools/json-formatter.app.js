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

async function loadMonacoSafely() {
  try {
    if (window.monaco?.editor) {
      return window.monaco;
    }

    if (!window.require) {
      return null;
    }

    window.require.config({
      paths: {
        vs: '/lib/monaco/vs'
      }
    });

    window.require.onError = console.error;

    await new Promise((resolve, reject) => {
      window.require(['vs/editor/editor.main'], resolve, reject);
    });

    if (!window.monaco?.editor) {
      throw new Error('Monaco loaded but editor missing');
    }

    return window.monaco;
  } catch {
    return null;
  }
}

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

    if (dom.formatBtn) dom.formatBtn.disabled = state.isBusy || !hasInput;
    if (dom.minifyBtn) dom.minifyBtn.disabled = state.isBusy || !hasInput;
    if (dom.validateBtn) dom.validateBtn.disabled = state.isBusy || !hasInput;
    if (dom.clearBtn) dom.clearBtn.disabled = state.isBusy || !hasInput;
    if (dom.copyBtn) dom.copyBtn.disabled = state.isBusy || !hasOutput;
    if (dom.downloadBtn) dom.downloadBtn.disabled = state.isBusy || !hasOutput;
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
    if (dom.payloadStats) {
      dom.payloadStats.textContent = formatCountSummary(state.inputModel.getValue());
    }

    if (dom.outputStats) {
      dom.outputStats.textContent = formatCountSummary(state.outputModel.getValue());
    }

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
      if (dom.validationState) dom.validationState.textContent = 'Invalid JSON';
      setMarkers(result.error.location, result.error.message);
      state.outputModel.setValue('');
      setErrorState(dom, result.error);
    } else {
      if (dom.validationState) dom.validationState.textContent = 'Valid JSON';
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
    if (dom.perfTime) {
      dom.perfTime.textContent =
        `${(performance.now() - started).toFixed(2)} ms`;
    }

    updateStats();
  };

  return {
    async init() {
      try {
        if (!dom.jsonEditor || !dom.outputEditor) {
          console.warn('[json-formatter] Editor containers missing; skipping editor initialization.');
          return;
        }

        let monacoLoaded = false;
        const buildFallbackEditors = () => {
          state.inputEditor = createFallbackEditor(dom.jsonEditor);
          state.outputEditor = createFallbackEditor(dom.outputEditor, { readOnly: true });
          state.inputModel = state.inputEditor;
          state.outputModel = state.outputEditor;
        };

        const buildMonacoEditors = () => {
          console.debug('[json-formatter] Monaco createModel(input) start');
          state.inputModel = state.monaco.editor.createModel(
            window.ToolNexusConfig?.jsonExampleInput ?? '',
            'json'
          );
          console.debug('[json-formatter] Monaco createModel(input) complete');

          console.debug('[json-formatter] Monaco createModel(output) start');
          state.outputModel = state.monaco.editor.createModel('', 'json');
          console.debug('[json-formatter] Monaco createModel(output) complete');

          const shared = {
            theme: JSON_FORMATTER_CONFIG.monacoTheme,
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 14
          };

          console.debug('[json-formatter] Monaco editor.create(input) start');
          state.inputEditor = state.monaco.editor.create(dom.jsonEditor, {
            ...shared,
            model: state.inputModel
          });
          console.debug('[json-formatter] Monaco editor.create(input) complete');

          console.debug('[json-formatter] Monaco editor.create(output) start');
          state.outputEditor = state.monaco.editor.create(dom.outputEditor, {
            ...shared,
            model: state.outputModel,
            readOnly: true
          });
          console.debug('[json-formatter] Monaco editor.create(output) complete');
        };

        state.monaco = await loadMonacoSafely();
        monacoLoaded = Boolean(state.monaco?.editor);

        if (monacoLoaded) {
          console.debug('[json-formatter] Monaco loaded successfully');
          buildMonacoEditors();
        } else {
          console.warn('[json-formatter] Monaco unavailable → fallback editor');
        }

        if (!monacoLoaded) {
          buildFallbackEditors();
        }

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
      } catch (e) {
        console.error(
          '[json-formatter] LIFECYCLE INIT CRASH',
          e,
          e?.stack
        );

        if (!state.inputModel || !state.outputModel) {
          state.inputEditor = createFallbackEditor(dom.jsonEditor);
          state.outputEditor = createFallbackEditor(dom.outputEditor, { readOnly: true });
          state.inputModel = state.inputEditor;
          state.outputModel = state.outputEditor;
          updateStats();
        }
      }
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
