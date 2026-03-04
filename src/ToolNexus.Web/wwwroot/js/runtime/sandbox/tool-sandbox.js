function buildSandboxPrelude() {
  return [
    '"use strict";',
    'const blocked = (name) => { throw new Error(`${name} is blocked inside community sandbox execution.`); };',
    'const top = undefined;',
    'const parent = undefined;',
    'const opener = undefined;',
    'const localStorage = new Proxy({}, { get: () => () => blocked("localStorage") });',
    'const sessionStorage = new Proxy({}, { get: () => () => blocked("sessionStorage") });',
    'const document = Object.freeze({ cookie: "", querySelector: () => null, querySelectorAll: () => [] });',
    'const cookie = "";',
    'const window = Object.freeze({ top, parent, opener, localStorage, sessionStorage, document, cookie });',
    'const globalThis = window;',
    'const self = window;'
  ].join('\n');
}

function createSandboxRunner(source) {
  return `${buildSandboxPrelude()}\n${String(source ?? '')}`;
}

function createIframeSrcdoc() {
  return `<!doctype html><html><head><meta charset="utf-8"></head><body><script>
const buildSandboxPrelude = ${buildSandboxPrelude.toString()};
const createSandboxRunner = ${createSandboxRunner.toString()};
const respond = (id, payload) => parent.postMessage({ source: 'toolnexus-community-sandbox', id, ...payload }, '*');
addEventListener('message', async (event) => {
  const data = event?.data ?? {};
  if (data.type !== 'execute') return;

  try {
    const runner = new Function('input', createSandboxRunner(data.source));
    const result = await runner(data.input);
    respond(data.id, { ok: true, result });
  } catch (error) {
    respond(data.id, { ok: false, error: { message: error?.message || 'Sandbox execution failed.' } });
  }
});
<\/script></body></html>`;
}

export function createIframeToolSandbox({ container = null, timeoutMs = 8000 } = {}) {
  const host = container ?? document.body;
  const pending = new Map();
  const iframe = document.createElement('iframe');

  iframe.setAttribute('sandbox', 'allow-scripts');
  iframe.setAttribute('referrerpolicy', 'no-referrer');
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.srcdoc = createIframeSrcdoc();

  host.appendChild(iframe);

  const onMessage = (event) => {
    const payload = event?.data;
    if (payload?.source !== 'toolnexus-community-sandbox') {
      return;
    }

    const resolver = pending.get(payload.id);
    if (!resolver) {
      return;
    }

    pending.delete(payload.id);
    clearTimeout(resolver.timer);

    if (payload.ok) {
      resolver.resolve(payload.result);
      return;
    }

    resolver.reject(new Error(payload?.error?.message || 'Sandbox execution failed.'));
  };

  window.addEventListener('message', onMessage);

  function execute(source, input) {
    const id = `sandbox-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('Sandbox timed out.'));
      }, timeoutMs);

      pending.set(id, { resolve, reject, timer });
      iframe.contentWindow?.postMessage({ type: 'execute', id, source: String(source ?? ''), input }, '*');
    });
  }

  function dispose() {
    for (const resolver of pending.values()) {
      clearTimeout(resolver.timer);
      resolver.reject(new Error('Sandbox disposed.'));
    }

    pending.clear();
    window.removeEventListener('message', onMessage);
    iframe.remove();
  }

  return { execute, dispose, type: 'iframe' };
}

export function createWorkerToolSandbox({ timeoutMs = 8000 } = {}) {
  const workerSource = `
const buildSandboxPrelude = ${buildSandboxPrelude.toString()};
const createSandboxRunner = ${createSandboxRunner.toString()};
self.addEventListener('message', async (event) => {
  const data = event?.data ?? {};
  if (data.type !== 'execute') return;

  try {
    const runner = new Function('input', createSandboxRunner(data.source));
    const result = await runner(data.input);
    self.postMessage({ id: data.id, ok: true, result });
  } catch (error) {
    self.postMessage({ id: data.id, ok: false, error: { message: error?.message || 'Sandbox execution failed.' } });
  }
});`;

  const blob = new Blob([workerSource], { type: 'text/javascript' });
  const worker = new Worker(URL.createObjectURL(blob));
  const pending = new Map();

  const onMessage = (event) => {
    const payload = event?.data;
    const resolver = pending.get(payload?.id);
    if (!resolver) {
      return;
    }

    pending.delete(payload.id);
    clearTimeout(resolver.timer);

    if (payload.ok) {
      resolver.resolve(payload.result);
      return;
    }

    resolver.reject(new Error(payload?.error?.message || 'Sandbox execution failed.'));
  };

  worker.addEventListener('message', onMessage);

  function execute(source, input) {
    const id = `sandbox-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('Sandbox timed out.'));
      }, timeoutMs);

      pending.set(id, { resolve, reject, timer });
      worker.postMessage({ type: 'execute', id, source: String(source ?? ''), input });
    });
  }

  function dispose() {
    for (const resolver of pending.values()) {
      clearTimeout(resolver.timer);
      resolver.reject(new Error('Sandbox disposed.'));
    }

    pending.clear();
    worker.removeEventListener('message', onMessage);
    worker.terminate();
  }

  return { execute, dispose, type: 'worker' };
}

export function createTrustedToolRuntime() {
  return {
    async execute(tool, input) {
      if (typeof tool?.run !== 'function') {
        throw new Error('Trusted tool runtime requires a callable run function.');
      }

      return await tool.run(input);
    },
    dispose() {}
  };
}
