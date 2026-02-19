import { getKeyboardEventManager } from './keyboard-event-manager.js';
import { RegexToolError, runRegexEvaluation } from './regex-tester.api.js';
import { renderRegexError, renderRegexResult, resolveRegexDom } from './regex-tester.dom.js';

const ROOT_APP_INSTANCE_KEY = '__toolNexusRegexTesterApp';

class RegexTesterApp {
  constructor(root, host = window) {
    this.root = root;
    this.host = host;
    this.dom = resolveRegexDom(root);
    this.rafId = 0;
    this.disposeKeyboardHandler = () => {};
    this.boundInputHandler = (event) => this.onInput(event);
    this.boundClickHandler = () => this.renderResult();

    if (!this.dom.patternInput || !this.dom.candidateInput || !this.dom.output) {
      return;
    }

    this.bindEvents();
    this.renderResult();
  }

  bindEvents() {
    this.root.addEventListener('input', this.boundInputHandler);
    this.dom.runButton?.addEventListener('click', this.boundClickHandler);

    this.disposeKeyboardHandler = getKeyboardEventManager().register({
      root: this.root,
      onKeydown: (event) => {
        if (!(event.ctrlKey || event.metaKey)) {
          return;
        }

        if (event.key !== 'Enter') {
          return;
        }

        event.preventDefault();
        this.renderResult();
      }
    });
  }

  onInput(event) {
    if (event.target === this.dom.patternInput || event.target === this.dom.flagsInput || event.target === this.dom.candidateInput) {
      this.scheduleRender();
    }
  }

  scheduleRender() {
    if (this.rafId) {
      this.host.cancelAnimationFrame(this.rafId);
    }

    this.rafId = this.host.requestAnimationFrame(() => {
      this.rafId = 0;
      this.renderResult();
    });
  }

  renderResult() {
    const config = {
      pattern: this.dom.patternInput.value,
      candidate: this.dom.candidateInput.value,
      flags: this.dom.flagsInput?.value ?? ''
    };

    try {
      const result = runRegexEvaluation(config.pattern, config.candidate, config.flags);
      renderRegexResult(this.dom, result);
    } catch (error) {
      renderRegexError(
        this.dom,
        error instanceof RegexToolError
          ? error.message
          : 'Unable to evaluate expression.'
      );
    }
  }

  destroy() {
    if (this.rafId) {
      this.host.cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }

    this.root.removeEventListener('input', this.boundInputHandler);
    this.dom.runButton?.removeEventListener('click', this.boundClickHandler);
    this.disposeKeyboardHandler();
    this.disposeKeyboardHandler = () => {};

    if (this.root?.[ROOT_APP_INSTANCE_KEY] === this) {
      delete this.root[ROOT_APP_INSTANCE_KEY];
    }
  }
}

export function createRegexTesterApp(root, host = window) {
  if (root?.[ROOT_APP_INSTANCE_KEY]) {
    return root[ROOT_APP_INSTANCE_KEY];
  }

  const app = new RegexTesterApp(root, host);
  if (root) {
    root[ROOT_APP_INSTANCE_KEY] = app;
  }

  return app;
}
