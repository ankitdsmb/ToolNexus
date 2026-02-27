const LOCAL_LOADER = '/lib/monaco/vs/loader.js';
const LOCAL_VS = '/lib/monaco/vs';
const CDN_LOADER = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs/loader.min.js';
const CDN_VS = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs';

let monacoPromise = null;
let requireConfigured = false;

function configureRequire(vsPath) {
  if (requireConfigured || typeof window.require !== 'function') {
    return;
  }

  window.require.config({ paths: { vs: vsPath } });
  requireConfigured = true;
}

function loadScriptOnce(src, marker) {
  const existing = document.querySelector(`script[${marker}]`);
  if (existing) {
    return existing.dataset.ready === 'true'
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
      });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.setAttribute(marker, 'true');
    script.addEventListener('load', () => {
      script.dataset.ready = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

async function loadAmdAndMonaco() {
  if (window.monaco?.editor) {
    return window.monaco;
  }

  if (typeof window.require === 'function') {
    configureRequire(LOCAL_VS);
  } else {
    try {
      await loadScriptOnce(LOCAL_LOADER, 'data-runtime-monaco-loader');
      configureRequire(LOCAL_VS);
    } catch {
      await loadScriptOnce(CDN_LOADER, 'data-runtime-monaco-loader-cdn');
      configureRequire(CDN_VS);
    }
  }

  await new Promise((resolve, reject) => {
    try {
      window.require(['vs/editor/editor.main'], resolve, reject);
    } catch (error) {
      reject(error);
    }
  });

  return window.monaco;
}

export function loadMonacoOnce() {
  if (window.monaco?.editor) {
    return Promise.resolve(window.monaco);
  }

  if (!monacoPromise) {
    monacoPromise = loadAmdAndMonaco().catch((error) => {
      monacoPromise = null;
      throw error;
    });
  }

  return monacoPromise;
}

export function resetMonacoLoaderForTesting() {
  monacoPromise = null;
  requireConfigured = false;
}

window.ToolNexusRuntimeServices ??= {};
window.ToolNexusRuntimeServices.monacoLoader = {
  load: loadMonacoOnce
};
