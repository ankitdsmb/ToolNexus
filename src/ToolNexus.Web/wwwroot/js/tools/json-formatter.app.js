import { FORMAT_MODE, runJsonFormatter } from './json-formatter.api.js';
import { JSON_FORMATTER_CONFIG } from './json-formatter/constants.js';
import { formatCountSummary } from './json-formatter/utils.js';
import { clearErrorState, pushToast, resolveJsonFormatterDom, setErrorState } from './json-formatter.dom.js';
import { getKeyboardEventManager } from './keyboard-event-manager.js';

export function createJsonFormatterApp(root) {
  const dom = resolveJsonFormatterDom(root);
  const state = {
    isBusy: false,
    autoFormatDebounce: null,
    keyboardDispose: () => {},
    inputSubscription: { dispose: () => {} },
    disposers: [],
    inputEditor: null,
    outputEditor: null,
    inputModel: null,
    outputModel: null,
    monaco: null
  };

  const bind = (element, eventName, handler) => {
    element?.addEventListener(eventName, handler);
    state.disposers.push(() => element?.removeEventListener(eventName, handler));
  };

  const createFallbackEditor = (host, { readOnly = false } = {}) => {
    const textarea = document.createElement('textarea');
    textarea.className = 'json-formatter-fallback-editor';
    textarea.readOnly = readOnly;
    textarea.spellcheck = false;
    textarea.setAttribute('aria-label', readOnly ? 'JSON output editor' : 'JSON input editor');
    host.replaceChildren(textarea);

    return {
      getValue: () => textarea.value,
      setValue: (value) => {
        textarea.value = value ?? '';
      },
      revealLine: () => {},
      updateOptions: () => {},
      onDidChangeContent: (handler) => {
        textarea.addEventListener('input', handler);
        return {
          dispose: () => textarea.removeEventListener('input', handler)
        };
      },
      dispose: () => {}
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
      state.monaco.editor.setModelMarkers(state.inputModel, JSON_FORMATTER_CONFIG.markerOwner, markers);
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
    dom.processingIndicator.hidden = true;
    clearErrorState(dom);

    const rawInput = state.inputModel.getValue();
    if (rawInput.length >= JSON_FORMATTER_CONFIG.slowPayloadChars) {
      dom.processingIndicator.hidden = false;
    }

    const result = runJsonFormatter(mode, rawInput, {
      indentSize: Number.parseInt(dom.indentSizeSelect.value, 10) || 2,
      sortKeys: dom.sortKeysToggle.checked
    });

    if (!result.ok) {
      dom.validationState.textContent = result.error.title === 'No input provided' ? 'Awaiting input' : 'Invalid JSON';
      setMarkers(result.error.location, result.error.message);
      state.outputModel.setValue('');
      if (result.error.title !== 'No input provided') {
        setErrorState(dom, result.error);
        dom.resultStatus.textContent = 'Validation failed.';
      }
    } else {
      dom.validationState.textContent = 'Valid JSON';
      setMarkers(null, '');
      state.outputModel.setValue(result.output);
      if (result.output) {
        state.outputEditor.revealLine(1);
      }
      dom.resultStatus.textContent = result.status;
      if (!options.silent) {
        pushToast(dom, mode === FORMAT_MODE.MINIFIED ? 'JSON minified.' : 'JSON formatted.');
      }
    }

    dom.processingIndicator.hidden = true;
    state.isBusy = false;
    dom.perfTime.textContent = `${(performance.now() - started).toFixed(2)} ms`;
    updateStats();
  };

  return {
    async init() {
      if (!dom.jsonEditor || !dom.outputEditor) {
        throw new Error('JSON formatter cannot start: required editor containers are unavailable.');
      }

      const isLocalRuntimeHost = ['127.0.0.1', 'localhost'].includes(window.location?.hostname ?? '');
      if (typeof window.require === 'function' && !isLocalRuntimeHost) {
        window.require.config({
          paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs' }
        });

        await new Promise((resolve) => window.require(['vs/editor/editor.main'], resolve));

        state.monaco = window.monaco;
        state.inputModel = state.monaco.editor.createModel(window.ToolNexusConfig?.jsonExampleInput ?? '', 'json');
        state.outputModel = state.monaco.editor.createModel('', 'json');

        const shared = {
          theme: JSON_FORMATTER_CONFIG.monacoTheme,
          minimap: { enabled: false },
          automaticLayout: true,
          fontSize: 14,
          fontFamily: 'var(--font-family-mono)',
          lineNumbers: 'on',
          wordWrap: 'off'
        };

        state.inputEditor = state.monaco.editor.create(dom.jsonEditor, {
          ...shared,
          model: state.inputModel,
          readOnly: false,
          glyphMargin: true
        });

        state.outputEditor = state.monaco.editor.create(dom.outputEditor, {
          ...shared,
          model: state.outputModel,
          readOnly: true
        });
      } else {
        state.inputEditor = createFallbackEditor(dom.jsonEditor);
        state.outputEditor = createFallbackEditor(dom.outputEditor, { readOnly: true });
        state.inputModel = state.inputEditor;
        state.outputModel = state.outputEditor;
        state.inputModel.setValue(window.ToolNexusConfig?.jsonExampleInput ?? '');
      }

      const onInputChanged = () => {
        updateStats();
        if (!dom.autoFormatToggle.checked) {
          return;
        }

        clearTimeout(state.autoFormatDebounce);
        state.autoFormatDebounce = window.setTimeout(() => {
          runPipeline(FORMAT_MODE.PRETTY, { silent: true });
        }, JSON_FORMATTER_CONFIG.autoFormatDebounceMs);
      };

      bind(dom.formatBtn, 'click', () => runPipeline(FORMAT_MODE.PRETTY));
      bind(dom.minifyBtn, 'click', () => runPipeline(FORMAT_MODE.MINIFIED));
      bind(dom.validateBtn, 'click', () => runPipeline(FORMAT_MODE.VALIDATE));
      bind(dom.clearBtn, 'click', () => {
        state.inputModel.setValue('');
        state.outputModel.setValue('');
        clearErrorState(dom);
        setMarkers(null, '');
        dom.validationState.textContent = 'Awaiting input';
        dom.resultStatus.textContent = 'Editors cleared.';
        updateStats();
      });
      bind(dom.copyBtn, 'click', async () => {
        const value = state.outputModel.getValue();
        if (!value) {
          return;
        }

        try {
          await navigator.clipboard.writeText(value);
          pushToast(dom, 'Output copied to clipboard.');
        } catch {
          pushToast(dom, 'Clipboard access is unavailable.', 'error');
        }
      });
      bind(dom.downloadBtn, 'click', () => {
        const value = state.outputModel.getValue();
        if (!value) {
          return;
        }

        const blob = new Blob([value], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `toolnexus-json-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
        pushToast(dom, 'JSON file downloaded.');
      });
      bind(dom.wrapToggle, 'change', () => {
        const wordWrap = dom.wrapToggle.checked ? 'on' : 'off';
        state.inputEditor.updateOptions({ wordWrap });
        state.outputEditor.updateOptions({ wordWrap });
      });

      state.inputSubscription = state.inputModel.onDidChangeContent(onInputChanged);

      state.keyboardDispose = getKeyboardEventManager().register({
        root,
        onKeydown: (event) => {
          if (event.ctrlKey && event.key === 'Enter') {
            event.preventDefault();
            runPipeline(FORMAT_MODE.PRETTY);
          }

          if (event.ctrlKey && event.key.toLowerCase() === 'l') {
            event.preventDefault();
            dom.clearBtn.click();
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
      state.disposers.forEach((dispose) => dispose());
      state.inputEditor?.dispose?.();
      state.outputEditor?.dispose?.();
      state.inputModel?.dispose?.();
      state.outputModel?.dispose?.();
    }
  };
}
