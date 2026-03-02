const MONACO_BASE = '/lib/monaco/vs';
const MONACO_LOADER_URL = `${MONACO_BASE}/loader.js`;
const MONACO_EDITOR_MAIN_URL = `${MONACO_BASE}/editor/editor.main.js`;
const MONACO_ASSET_INVALID_EVENT = 'monaco_asset_invalid';

let monacoPromise = null;

function emitMonacoAssetInvalidWarning() {
  console.warn(`[runtime] ${MONACO_ASSET_INVALID_EVENT}`);
}

function logRuntimeMonaco(message, detail) {
  if (detail) {
    console.info(`[runtime] ${message}`, detail);
    return;
  }

  console.info(`[runtime] ${message}`);
}

function assertValidAmdLoader() {
  if (typeof window.require !== 'function') {
    throw new Error('Monaco loader missing');
  }
}

async function isAssetAvailable(assetUrl) {
  const hasFetch = typeof globalThis.fetch === 'function';
  if (!hasFetch) {
    return true;
  }

  const probe = async (method) => {
    const response = await fetch(assetUrl, {
      method,
      cache: 'no-store'
    });

    return response.ok;
  };

  try {
    const headOk = await probe('HEAD');
    if (headOk) {
      return true;
    }
  } catch {
    // some static hosts may reject HEAD; fall through to GET
  }

  try {
    return await probe('GET');
  } catch {
    return false;
  }
}

async function assertMonacoAssetsAvailable() {
  const requiredAssets = [MONACO_LOADER_URL, MONACO_EDITOR_MAIN_URL];

  const missingAssets = [];
  for (const assetUrl of requiredAssets) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await isAssetAvailable(assetUrl);
    if (!exists) {
      missingAssets.push(assetUrl);
    }
  }

  if (missingAssets.length > 0) {
    throw new Error(`[runtime] Monaco asset missing: ${missingAssets.join(', ')}`);
  }
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
      existing.addEventListener('error', () => reject(new Error(`[runtime] Monaco loader local script failed: ${MONACO_LOADER_URL}`)), { once: true });
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

    script.addEventListener('error', () => reject(new Error(`[runtime] Monaco loader local script failed: ${MONACO_LOADER_URL}`)), { once: true });

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

function createWorkerUrlForLabel(label) {
  switch (label) {
    case 'json':
      return '/lib/monaco/vs/language/json/json.worker.js';
    case 'css':
    case 'scss':
    case 'less':
      return '/lib/monaco/vs/language/css/css.worker.js';
    case 'html':
    case 'handlebars':
    case 'razor':
      return '/lib/monaco/vs/language/html/html.worker.js';
    case 'typescript':
    case 'javascript':
      return '/lib/monaco/vs/language/typescript/ts.worker.js';
    default:
      return '/lib/monaco/vs/editor/editor.worker.js';
  }
}

function activateMonacoEnvironment() {
  window.MonacoEnvironment = {
    getWorkerUrl: (_moduleId, label) => createWorkerUrlForLabel(label)
  };

  logRuntimeMonaco('Monaco worker mapping active');
}

export async function loadMonaco() {
  if (window.monaco?.editor) {
    logRuntimeMonaco('Monaco already loaded');
    return window.monaco;
  }

  if (monacoPromise) {
    return monacoPromise;
  }

  monacoPromise = (async () => {
    logRuntimeMonaco('Monaco loading start');
    await assertMonacoAssetsAvailable();
    await ensureMonacoLoaderScript();
    logRuntimeMonaco('Monaco loader resolved');

    if (typeof window.require !== 'function' || typeof window.require.config !== 'function') {
      throw new Error('Invalid Monaco AMD loader detected');
    }

    assertValidAmdLoader();

    window.require.config({
      paths: {
        vs: MONACO_BASE
      }
    });

    activateMonacoEnvironment();

    const resolvedMonaco = await requireMonaco();

    if (resolvedMonaco && !window.monaco) {
      window.monaco = resolvedMonaco;
    }

    if (!window.monaco?.editor) {
      emitMonacoAssetInvalidWarning();
      return null;
    }

    logRuntimeMonaco('Monaco ready');
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
