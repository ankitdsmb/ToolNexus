const MONACO_BASE = '/lib/monaco/vs';
const MONACO_LOADER_URL = `${MONACO_BASE}/loader.js`;
const MONACO_EDITOR_MAIN_URL = `${MONACO_BASE}/editor/editor.main.js`;
const MONACO_ASSET_INVALID_EVENT = 'monaco_asset_invalid';

const MONACO_WORKER_PATHS = Object.freeze({
  json: '/lib/monaco/vs/language/json/json.worker.js',
  css: '/lib/monaco/vs/language/css/css.worker.js',
  html: '/lib/monaco/vs/language/html/html.worker.js',
  typescript: '/lib/monaco/vs/language/typescript/ts.worker.js',
  default: '/lib/monaco/vs/editor/editor.worker.js'
});

const MONACO_WORKER_LABELS = Object.freeze({
  json: MONACO_WORKER_PATHS.json,
  css: MONACO_WORKER_PATHS.css,
  scss: MONACO_WORKER_PATHS.css,
  less: MONACO_WORKER_PATHS.css,
  html: MONACO_WORKER_PATHS.html,
  handlebars: MONACO_WORKER_PATHS.html,
  razor: MONACO_WORKER_PATHS.html,
  typescript: MONACO_WORKER_PATHS.typescript,
  javascript: MONACO_WORKER_PATHS.typescript
});

let monacoPromise = null;
let monacoLoadSequence = 0;

const MONACO_SINGLETON_KEY = '__toolnexus_monaco';
const MONACO_SINGLETON_PROMISE_KEY = '__toolnexus_monaco_promise';

function emitMonacoAssetInvalidWarning() {
  console.warn(`[runtime] ${MONACO_ASSET_INVALID_EVENT}`);
}

export function isMonacoReady() {
  return Boolean(
    window.monaco
    && window.monaco.editor
    && typeof window.monaco.editor.create === 'function'
  );
}

function assignGlobalMonaco(monacoNamespace) {
  if (!monacoNamespace) {
    return null;
  }

  window.monaco = monacoNamespace;
  globalThis.monaco = monacoNamespace;
  return monacoNamespace;
}

function logRuntimeMonaco(message, detail) {
  if (detail) {
    console.info(`[runtime] ${message}`, detail);
    return;
  }

  console.info(`[runtime] ${message}`);
}

function createMonacoLoadCorrelationId() {
  monacoLoadSequence += 1;
  return `monaco-${Date.now()}-${monacoLoadSequence}`;
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
  const requiredAssets = [
    MONACO_LOADER_URL,
    MONACO_EDITOR_MAIN_URL,
    ...new Set([...Object.values(MONACO_WORKER_PATHS), ...Object.values(MONACO_WORKER_LABELS)])
  ];

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
      (monacoNamespace) => resolve(monacoNamespace ?? window.monaco ?? globalThis.monaco ?? null),
      reject
    );
  });
}

function createWorkerUrlForLabel(label) {
  if (!label) {
    return MONACO_WORKER_PATHS.default;
  }

  return MONACO_WORKER_LABELS[label] ?? MONACO_WORKER_PATHS.default;
}

function createLocalWorkerAbsoluteUrl(workerPath) {
  const workerUrl = new URL(workerPath, window.location.origin);
  if (workerUrl.origin !== window.location.origin) {
    throw new Error(`[runtime] Monaco worker rejected non-local origin: ${workerUrl.href}`);
  }

  return workerUrl.href;
}

function createLocalMonacoWorker(label) {
  const workerPath = createWorkerUrlForLabel(label);
  const workerUrl = createLocalWorkerAbsoluteUrl(workerPath);

  return new Worker(workerUrl, {
    name: `toolnexus-monaco-${label || 'editor'}-worker`
  });
}

async function assertMonacoWorkerMapping() {
  const labelsToVerify = [...new Set(['', ...Object.keys(MONACO_WORKER_LABELS)])];
  const invalidMappings = [];

  for (const label of labelsToVerify) {
    const mappedWorkerPath = createWorkerUrlForLabel(label);

    if (!mappedWorkerPath.startsWith('/lib/monaco/vs/')) {
      invalidMappings.push(`${label || 'default'} -> ${mappedWorkerPath}`);
      continue;
    }

    let absoluteWorkerUrl;
    try {
      absoluteWorkerUrl = createLocalWorkerAbsoluteUrl(mappedWorkerPath);
    } catch {
      invalidMappings.push(`${label || 'default'} -> ${mappedWorkerPath}`);
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const workerExists = await isAssetAvailable(absoluteWorkerUrl);
    if (!workerExists) {
      invalidMappings.push(`${label || 'default'} -> ${mappedWorkerPath}`);
    }
  }

  if (invalidMappings.length > 0) {
    throw new Error(`[runtime] Monaco worker mapping invalid: ${invalidMappings.join(', ')}`);
  }
}

function activateMonacoEnvironment() {
  window.MonacoEnvironment = {
    getWorkerUrl: (_moduleId, label) => createWorkerUrlForLabel(label),
    getWorker: (_moduleId, label) => createLocalMonacoWorker(label)
  };

  logRuntimeMonaco('Monaco worker mapping active');
}

export async function loadMonaco() {
  const correlationId = createMonacoLoadCorrelationId();

  if (isMonacoReady()) {
    logRuntimeMonaco('Monaco already loaded', { correlationId });
    const monaco = window[MONACO_SINGLETON_KEY] ?? window.monaco;
    assignGlobalMonaco(monaco);
    return monaco;
  }

  if (window[MONACO_SINGLETON_PROMISE_KEY]) {
    logRuntimeMonaco('Monaco load joining shared promise', { correlationId });
    return window[MONACO_SINGLETON_PROMISE_KEY];
  }

  if (monacoPromise) {
    logRuntimeMonaco('Monaco load joining in-flight promise', { correlationId });
    return monacoPromise;
  }

  monacoPromise = (async () => {
    logRuntimeMonaco('Monaco loading start', { correlationId });
    await assertMonacoAssetsAvailable();
    await ensureMonacoLoaderScript();
    logRuntimeMonaco('Monaco loader resolved', { correlationId });

    if (typeof window.require !== 'function' || typeof window.require.config !== 'function') {
      throw new Error('Invalid Monaco AMD loader detected');
    }

    assertValidAmdLoader();

    await assertMonacoWorkerMapping();
    logRuntimeMonaco('Monaco worker mapping verified', { correlationId });

    window.require.config({
      paths: {
        vs: MONACO_BASE
      }
    });

    activateMonacoEnvironment();

    const resolvedMonaco = await requireMonaco();
    const monaco = assignGlobalMonaco(resolvedMonaco ?? window.monaco ?? globalThis.monaco ?? null);

    if (!isMonacoReady()) {
      emitMonacoAssetInvalidWarning();
      throw new Error('[runtime] Monaco namespace unavailable after loader resolution');
    }

    window[MONACO_SINGLETON_KEY] = monaco ?? window.monaco;
    logRuntimeMonaco('Monaco ready', { correlationId });
    return window[MONACO_SINGLETON_KEY];
  })().catch((error) => {
    monacoPromise = null;
    window[MONACO_SINGLETON_PROMISE_KEY] = null;

    if (error?.message === 'Invalid Monaco AMD loader detected') {
      throw error;
    }

    console.warn('[runtime] Monaco unavailable; falling back to basic editors', {
      correlationId,
      error
    });
    throw error;
  });

  window[MONACO_SINGLETON_PROMISE_KEY] = monacoPromise;

  return monacoPromise;
}

export async function initializeMonacoRuntime(options = {}) {
  const {
    timeoutMs = 4000,
    logPrefix = 'runtime'
  } = options;

  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`[${logPrefix}] Monaco load timeout (${timeoutMs}ms)`));
    }, timeoutMs);
  });

  try {
    const monaco = await Promise.race([loadMonaco(), timeoutPromise]);
    const ready = Boolean(monaco?.editor && typeof monaco.editor.create === 'function');

    return {
      monaco: ready ? monaco : null,
      ready,
      mode: ready ? 'monaco' : 'fallback'
    };
  } catch (error) {
    console.error(`[${logPrefix}] Monaco load failed`, error);
    return {
      monaco: null,
      ready: false,
      mode: 'fallback',
      error
    };
  } finally {
    if (typeof timeoutId === 'number') {
      clearTimeout(timeoutId);
    }
  }
}

export function resetMonacoLoaderForTesting() {
  monacoPromise = null;
  window[MONACO_SINGLETON_KEY] = null;
  window[MONACO_SINGLETON_PROMISE_KEY] = null;
}

window.ToolNexusRuntimeServices ??= {};
window.ToolNexusRuntimeServices.monacoLoader = {
  load: loadMonaco,
  initialize: initializeMonacoRuntime
};
