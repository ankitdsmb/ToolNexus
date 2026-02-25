import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'text-intelligence-analyzer';

function resolveRoot() {
  return document.querySelector(`.tool-page[data-slug="${TOOL_ID}"]`) ?? document.getElementById('tool-root');
}

function resolveRootFromContext(rootOrContext) {
  if (rootOrContext instanceof Element) {
    return rootOrContext;
  }

  if (rootOrContext?.root instanceof Element) {
    return rootOrContext.root;
  }

  if (rootOrContext?.toolRoot instanceof Element) {
    return rootOrContext.toolRoot;
  }

  return resolveRoot();
}

function resolveExecutionUrl() {
  const apiBaseUrl = window.ToolNexusConfig?.apiBaseUrl ?? '';
  const pathPrefix = window.ToolNexusConfig?.toolExecutionPathPrefix ?? '/api/v1/tools';
  return `${apiBaseUrl}${pathPrefix}/${TOOL_ID}/analyze`;
}

class TextIntelligenceAnalyzerRuntime {
  constructor(root) {
    this.root = root;
    this.abortController = new AbortController();
    this.run = this.run.bind(this);
  }

  init() {
    try {
      const inputPanel = this.root.querySelector('[data-tool-input]');
      const outputPanel = this.root.querySelector('[data-tool-output]');
      const actionsPanel = this.root.querySelector('[data-tool-actions]');

      if (!inputPanel || !outputPanel || !actionsPanel) {
        throw new Error('Required runtime panels are missing.');
      }

      inputPanel.innerHTML = `
        <label for="textAnalyzerInput" class="tool-label">Text input</label>
        <textarea id="textAnalyzerInput" class="tool-textarea" rows="14" placeholder="Paste text to analyze"></textarea>
      `;

      outputPanel.innerHTML = `
        <label for="textAnalyzerOutput" class="tool-label">Insights</label>
        <pre id="textAnalyzerOutput" class="tool-output" aria-live="polite"></pre>
      `;

      actionsPanel.innerHTML = `
        <button id="textAnalyzerRun" type="button" class="tool-btn">Analyze</button>
      `;

      this.input = this.root.querySelector('#textAnalyzerInput');
      this.output = this.root.querySelector('#textAnalyzerOutput');
      this.runButton = this.root.querySelector('#textAnalyzerRun');

      this.input.value = 'ToolNexus provides stable developer tooling.';
      this.runButton.addEventListener('click', this.run, { signal: this.abortController.signal });
    } catch (error) {
      console.error('tool mount error', error);
      throw error;
    }
  }

  async run() {
    try {
      this.runButton.disabled = true;
      this.output.textContent = 'Running...';

      const response = await fetch(resolveExecutionUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: this.input.value ?? '' })
      });

      if (!response.ok) {
        throw new Error(`Execution failed (${response.status})`);
      }

      const result = await response.json();
      const value = result?.output ?? result?.result ?? result;
      this.output.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    } catch (error) {
      console.error('tool mount error', error);
      this.output.textContent = error?.message ?? String(error);
    } finally {
      this.runButton.disabled = false;
    }
  }

  destroy() {
    this.abortController.abort();
  }
}

export function create(rootOrContext = resolveRoot()) {
  const root = resolveRootFromContext(rootOrContext);
  if (!root) {
    return null;
  }

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => {
      const app = new TextIntelligenceAnalyzerRuntime(root);
      app.init();
      return app;
    },
    destroy: (app) => app?.destroy?.()
  });
}

export function init(rootOrContext = resolveRoot()) {
  try {
    const handle = create(rootOrContext);
    handle?.init();
    return handle;
  } catch (error) {
    console.error('tool mount error', error);
    throw error;
  }
}

export function destroy(root = resolveRoot()) {
  if (!root) {
    return;
  }

  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules[TOOL_ID] = { create, init, destroy };
