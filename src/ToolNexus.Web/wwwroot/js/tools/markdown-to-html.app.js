import { getKeyboardEventManager } from './keyboard-event-manager.js';
import { runMarkdownToHtml } from './markdown-to-html.api.js';
import { getMarkdownToHtmlDom } from './markdown-to-html.dom.js';

const APP_INSTANCES = new WeakMap();

class MarkdownToHtmlApp {
  constructor(root) {
    this.dom = getMarkdownToHtmlDom(root);
    this.disposeHandlers = [];
    this.disposeKeyboardHandler = null;

    if (!this.dom?.input || !this.dom?.output) {
      return;
    }

    this.bindEvents();
  }

  on(element, eventName, handler) {
    if (!element) {
      return;
    }

    element.addEventListener(eventName, handler);
    this.disposeHandlers.push(() => element.removeEventListener(eventName, handler));
  }

  bindEvents() {
    this.on(this.dom.convertButton, 'click', () => {
      void this.convert();
    });

    this.on(this.dom.clearButton, 'click', () => {
      this.clear();
    });

    this.disposeKeyboardHandler = getKeyboardEventManager().register({
      root: this.dom.root,
      onKeydown: (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          void this.convert();
        }

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
          event.preventDefault();
          this.clear();
        }
      }
    });
  }

  async convert() {
    this.dom.output.value = await runMarkdownToHtml('convert', this.dom.input.value);
    if (this.dom.statusText) {
      this.dom.statusText.textContent = 'Converted';
    }
  }

  clear() {
    this.dom.input.value = '';
    this.dom.output.value = '';
    if (this.dom.statusText) {
      this.dom.statusText.textContent = 'Ready';
    }
  }

  destroy() {
    this.disposeKeyboardHandler?.();
    this.disposeKeyboardHandler = null;

    while (this.disposeHandlers.length > 0) {
      this.disposeHandlers.pop()?.();
    }

    APP_INSTANCES.delete(this.dom.root);
  }
}

export function createMarkdownToHtmlApp(root) {
  if (!root) {
    return null;
  }

  if (APP_INSTANCES.has(root)) {
    return APP_INSTANCES.get(root);
  }

  const app = new MarkdownToHtmlApp(root);
  APP_INSTANCES.set(root, app);
  return app;
}
