const MONACO_BASE = '/lib/monaco/vs';
const MONACO_LOADER_URL = `${MONACO_BASE}/loader.js`;
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
      existing.addEventListener('error', () => reject(new Error('[runtime] Monaco loader local script failed')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = MONACO_LOADER_URL;
    script.dataset.runtimeMonacoLoader = MONACO_LOADER_URL;

    script.addEventListener('load', () => {
      script.dataset.runtimeMonacoReady = 'true';
      resolve();
    }, { once: true });

    script.addEventListener('error', () => reject(new Error('[runtime] Monaco loader local script failed')), { once: true });

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
      getWorkerUrl: (_moduleId, label) => {
        const workerMap = {
          json: 'language/json/json.worker',
          css: 'language/css/css.worker',
          scss: 'language/css/css.worker',
          less: 'language/css/css.worker',
          html: 'language/html/html.worker',
          handlebars: 'language/html/html.worker',
          razor: 'language/html/html.worker',
          typescript: 'language/typescript/ts.worker',
          javascript: 'language/typescript/ts.worker'
        };

        const workerEntry = workerMap[label] ?? 'base/worker/workerMain';
        return `${MONACO_BASE}/${workerEntry}.js`;
      }
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
