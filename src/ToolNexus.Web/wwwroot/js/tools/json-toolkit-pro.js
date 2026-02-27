import { getToolPlatformKernel, normalizeToolRoot } from './tool-platform-kernel.js';

const TOOL_ID = 'json-toolkit-pro';
const DEFAULT_OPERATION = 'analyze';

function resolveRoot(context) {
  if (context?.handle?.id === TOOL_ID && context.handle?.root instanceof Element) {
    return context.handle.root;
  }

  return normalizeToolRoot(context);
}

function requireRuntimeRoot(context) {
  const root = resolveRoot(context);
  if (!root) {
    throw new Error(`[${TOOL_ID}] invalid lifecycle root`);
  }

  return root;
}


function resolveExecutionUrl() {
  const apiBaseUrl = window.ToolNexusConfig?.apiBaseUrl ?? '';
  const pathPrefix = window.ToolNexusConfig?.toolExecutionPathPrefix ?? '/api/v1/tools';
  return `${apiBaseUrl}${pathPrefix}/${TOOL_ID}/execute`;
}

class JsonToolkitProRuntime {
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
        <label for="jsonToolkitInput" class="tool-label">JSON input</label>
        <textarea id="jsonToolkitInput" class="tool-textarea" rows="14" spellcheck="false" placeholder="{\"name\":\"Ada\"}"></textarea>
      `;

      outputPanel.innerHTML = `
        <label for="jsonToolkitOutput" class="tool-label">Output</label>
        <pre id="jsonToolkitOutput" class="tool-output" aria-live="polite"></pre>
      `;

      actionsPanel.innerHTML = `
        <label for="jsonToolkitOperation" class="tool-label">Operation</label>
        <select id="jsonToolkitOperation" class="tool-select">
          <option value="analyze">Analyze</option>
          <option value="pretty">Pretty print</option>
          <option value="normalize">Normalize</option>
        </select>
        <button id="jsonToolkitRun" type="button" class="tool-btn">Run</button>
      `;

      this.input = this.root.querySelector('#jsonToolkitInput');
      this.output = this.root.querySelector('#jsonToolkitOutput');
      this.operation = this.root.querySelector('#jsonToolkitOperation');
      this.runButton = this.root.querySelector('#jsonToolkitRun');

      this.input.value = '{\n  "user": {\n    "name": "Ada"\n  }\n}';
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

      const payload = {
        operation: this.operation.value || DEFAULT_OPERATION,
        json: this.input.value ?? ''
      };

      const response = await fetch(resolveExecutionUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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

export function create(context) {
  const root = requireRuntimeRoot(context);
  if (!root) {
    return null;
  }

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => {
      const app = new JsonToolkitProRuntime(root);
      app.init();
      return app;
    },
    destroy: (app) => app?.destroy?.()
  });
}

export function init(context) {
  const root = context?.root || context?.toolRoot || context;
  if (!(root instanceof Element)) {
    throw new Error('Invalid mount root');
  }

  try {
    const handle = create(root);
    handle?.init();
    return handle;
  } catch (error) {
    console.error('tool mount error', error);
    throw error;
  }
}

export function destroy(context) {
  const root = requireRuntimeRoot(context);

  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}
