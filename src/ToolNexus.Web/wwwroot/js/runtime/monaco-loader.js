const MONACO_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs';
const MONACO_LOADER_URL = `${MONACO_BASE}/loader.min.js`;
const MONACO_ASSET_INVALID_EVENT = 'monaco_asset_invalid';

let monacoPromise = null;

function emitMonacoAssetInvalidWarning() {
  console.warn(`[runtime] ${MONACO_ASSET_INVALID_EVENT}`);
}

function assertValidAmdLoader() {

  if (typeof window.require !== 'function') {
    throw new Error('Monaco loader missing');
  }

  // CDN loader may NOT expose contexts early.
  // only validate require exists.
}

function ensureMonacoLoaderScript() {
  if (window.require?.s?.contexts?._) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-runtime-monaco-loader="${MONACO_LOADER_URL}"]`);

    if (existing) {
      if (existing.dataset.runtimeMonacoReady === 'true') {
        resolve();
        return;
      }

      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error('[runtime] Monaco loader CDN script failed')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = MONACO_LOADER_URL;
    script.crossOrigin = 'anonymous';
    script.dataset.runtimeMonacoLoader = MONACO_LOADER_URL;

    script.addEventListener('load', () => {
      script.dataset.runtimeMonacoReady = 'true';
      resolve();
    }, { once: true });

    script.addEventListener('error', () => reject(new Error('[runtime] Monaco loader CDN script failed')), { once: true });

    document.head.appendChild(script);
  });
}

function requireMonaco() {
  return new Promise((resolve, reject) => {
    window.require(
      ['vs/editor/editor.main'],
      (monacoNamespace) => resolve(monacoNamespace ?? window.monaco ?? null),
      reject
    );
  });
}

export async function loadMonaco() {
  if (window.monaco?.editor) {
    console.info('[runtime] Monaco already loaded');
    return window.monaco;
  }

  if (monacoPromise) {
    return monacoPromise;
  }

  monacoPromise = (async () => {
    await ensureMonacoLoaderScript();

    if (typeof window.require !== 'function' || typeof window.require.config !== 'function') {
      throw new Error('Invalid Monaco AMD loader detected');
    }

    assertValidAmdLoader();

    window.require.config({
      paths: {
        vs: MONACO_BASE
      }
    });

    window.MonacoEnvironment = {
      getWorkerUrl: () => `${MONACO_BASE}/base/worker/workerMain.js`
    };

    const resolvedMonaco = await requireMonaco();

    if (resolvedMonaco && !window.monaco) {
      window.monaco = resolvedMonaco;
    }

    if (!window.monaco?.editor) {
      emitMonacoAssetInvalidWarning();
      return null;
    }

    console.info('[runtime] Monaco loaded successfully');
    return window.monaco;
  })().catch((error) => {
    monacoPromise = null;

    if (error?.message === 'Invalid Monaco AMD loader detected') {
      throw error;
    }

    console.warn('[runtime] Monaco unavailable; falling back to basic editors', error);
    return null;
  });

  return monacoPromise;
}

export function resetMonacoLoaderForTesting() {
  monacoPromise = null;
}

window.ToolNexusRuntimeServices ??= {};
window.ToolNexusRuntimeServices.monacoLoader = {
  load: loadMonaco
};
