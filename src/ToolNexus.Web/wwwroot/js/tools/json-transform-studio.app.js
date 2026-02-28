import { ACTIONS } from './json-transform-studio.api.js';
import {
  clearError,
  queryJsonTransformStudioDom,
  renderDiagnostics,
  renderError,
  renderMetrics
} from './json-transform-studio.dom.js';

export function createJsonTransformStudioApp(root, execute) {
  const dom = queryJsonTransformStudioDom(root);
  const eventController = new AbortController();

  const runAction = async (action) => {
    clearError(dom);

    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    const result = await execute(action, dom.inputEditor.value, {
      filterText: dom.pathFilterInput.value
    });

    renderMetrics(dom, result.metrics);

    if (!result.ok) {
      dom.outputEditor.value = '';
      renderDiagnostics(dom, null, true);
      renderError(dom, result.error);
      return;
    }

    dom.outputEditor.value = result.output;
    renderDiagnostics(dom, result.diagnostics);
  };

  const bindButton = (id, action) => {
    dom[id].addEventListener('click', () => runAction(action), { signal: eventController.signal });
  };

  return {
    init() {
      bindButton('formatBtn', ACTIONS.FORMAT);
      bindButton('minifyBtn', ACTIONS.MINIFY);
      bindButton('flattenBtn', ACTIONS.FLATTEN);
      bindButton('extractKeysBtn', ACTIONS.EXTRACT_KEYS);
      bindButton('filterPathsBtn', ACTIONS.FILTER_PATHS);

      dom.clearBtn.addEventListener('click', () => {
        dom.inputEditor.value = '';
        dom.outputEditor.value = '';
        dom.pathFilterInput.value = '';
        clearError(dom);
        dom.diagnosticsOutput.textContent = 'Ready for execution.';
        renderMetrics(dom, { durationMs: 0, inputChars: 0, outputChars: 0, throughputCharsPerMs: 0 });
      }, { signal: eventController.signal });

      dom.diagnosticsOutput.textContent = 'Ready for execution.';
    },
    destroy() {
      eventController.abort();
    }
  };
}
