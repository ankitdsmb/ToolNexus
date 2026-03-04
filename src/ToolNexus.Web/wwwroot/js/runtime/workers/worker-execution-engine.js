import {
  createWorkerRequest,
  isHeavyWorkerOperation,
  isWorkerResponseSuccess
} from './worker-message-protocol.js';

function runMainThreadOperation(operation, payload = {}) {
  switch (operation) {
    case 'jsonFormat':
      return JSON.stringify(JSON.parse(String(payload.value ?? '{}')), null, Number.isInteger(payload.indent) ? payload.indent : 2);
    case 'cssAnalyze': {
      const css = String(payload.value ?? '');
      const selectors = css
        .split('{')
        .slice(0, -1)
        .map((part) => part.trim())
        .filter(Boolean)
        .flatMap((selectorSet) => selectorSet.split(','))
        .map((selector) => selector.trim())
        .filter(Boolean);

      return {
        selectorCount: selectors.length,
        uniqueSelectorCount: new Set(selectors).size,
        ruleCount: (css.match(/\{/g) || []).length,
        declarationCount: (css.match(/:[^;{}]+;/g) || []).length
      };
    }
    case 'textTransform': {
      const value = String(payload.value ?? '');
      if (payload.mode === 'upper') return value.toUpperCase();
      if (payload.mode === 'lower') return value.toLowerCase();
      if (payload.mode === 'trim') return value.trim();
      return value;
    }
    case 'textDiff': {
      const before = String(payload.before ?? '').split(/\r?\n/);
      const after = String(payload.after ?? '').split(/\r?\n/);
      const removed = before.filter((line) => !after.includes(line));
      const added = after.filter((line) => !before.includes(line));

      return {
        summary: {
          added: added.length,
          removed: removed.length,
          changed: Math.max(added.length, removed.length)
        },
        tokens: [
          ...removed.map((value, index) => ({ type: 'removed', lineNumber: index + 1, value })),
          ...added.map((value, index) => ({ type: 'added', lineNumber: index + 1, value }))
        ]
      };
    }
    default:
      throw new Error(`Unsupported execution operation \"${operation}\".`);
  }
}

export function createWorkerExecutionEngine({
  enabled = true,
  workerUrl = '/js/runtime/workers/tool-execution-worker.js'
} = {}) {
  const supportsWorkers = typeof Worker !== 'undefined';
  const shouldUseWorkers = Boolean(enabled && supportsWorkers);
  const pending = new Map();
  let worker = null;

  function ensureWorker() {
    if (!shouldUseWorkers) {
      return null;
    }

    if (!worker) {
      worker = new Worker(workerUrl, { type: 'module', name: 'toolnexus-tool-execution-worker' });
      worker.addEventListener('message', (event) => {
        const response = event.data;
        const resolver = pending.get(response?.id);
        if (!resolver) {
          return;
        }

        pending.delete(response.id);

        if (isWorkerResponseSuccess(response)) {
          resolver.resolve({ result: response.result, metrics: response.metrics, worker: true });
          return;
        }

        resolver.reject(new Error(response?.error?.message || 'Worker task failed.'));
      });

      worker.addEventListener('error', (error) => {
        for (const request of pending.values()) {
          request.reject(error instanceof Error ? error : new Error('Worker process crashed.'));
        }
        pending.clear();
      });
    }

    return worker;
  }

  async function execute(operation, payload = {}, { allowMainThreadFallback = true } = {}) {
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const useWorker = shouldUseWorkers && isHeavyWorkerOperation(operation);

    if (!useWorker) {
      const result = runMainThreadOperation(operation, payload);
      const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      return {
        result,
        metrics: { durationMs: Number((endedAt - startedAt).toFixed(3)) },
        worker: false
      };
    }

    try {
      const client = ensureWorker();
      const request = createWorkerRequest(operation, payload);

      return await new Promise((resolve, reject) => {
        pending.set(request.id, { resolve, reject });
        client.postMessage(request);
      });
    } catch (error) {
      if (!allowMainThreadFallback) {
        throw error;
      }

      const result = runMainThreadOperation(operation, payload);
      const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

      return {
        result,
        metrics: {
          durationMs: Number((endedAt - startedAt).toFixed(3)),
          fallback: 'main-thread'
        },
        worker: false
      };
    }
  }

  function dispose() {
    if (worker) {
      worker.terminate();
      worker = null;
    }

    for (const request of pending.values()) {
      request.reject(new Error('Worker execution engine disposed.'));
    }

    pending.clear();
  }

  return {
    execute,
    dispose,
    isWorkerEnabled: () => shouldUseWorkers
  };
}
