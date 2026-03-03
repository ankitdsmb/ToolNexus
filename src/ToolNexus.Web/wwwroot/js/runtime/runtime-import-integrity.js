let allowlistCache = null;
let allowlistPromise = null;
const OBSERVED_IMPORTS = new Set();
const OBSERVED_IMPORTS_KEY = '__TOOLNEXUS_RUNTIME_IMPORTS__';
const OBSERVED_IMPORTS_ARTIFACT_PATH = '/artifacts/runtime-import-observed.json';
let flushRegistered = false;

function resolveGlobalScope() {
  if (typeof window !== 'undefined') {
    return window;
  }

  return globalThis;
}

function isDebugEnabled() {
  const scope = resolveGlobalScope();
  const config = scope?.ToolNexusConfig ?? {};
  return Boolean(scope?.DEBUG ?? scope?.__DEBUG__ ?? config.DEBUG ?? config.debug);
}

function isProductionRuntime() {
  const scope = resolveGlobalScope();
  const config = scope?.ToolNexusConfig ?? {};
  const env = String(config.environment ?? config.env ?? scope?.process?.env?.NODE_ENV ?? '').trim().toLowerCase();
  return env === 'production' || env === 'prod';
}

function isImportTelemetryEnabled() {
  return !isProductionRuntime() || isDebugEnabled();
}

function normalizeObservedPath(modulePath) {
  if (typeof modulePath !== 'string' || modulePath.length === 0) {
    return null;
  }

  try {
    return new URL(modulePath, import.meta.url).pathname;
  } catch {
    return modulePath;
  }
}

function ensureObservedImportStore() {
  const scope = resolveGlobalScope();
  if (!Array.isArray(scope[OBSERVED_IMPORTS_KEY])) {
    scope[OBSERVED_IMPORTS_KEY] = [];
  }

  return scope[OBSERVED_IMPORTS_KEY];
}

function updateObservedImportStore() {
  const store = ensureObservedImportStore();
  store.length = 0;
  store.push(...Array.from(OBSERVED_IMPORTS));
}

export function observeRuntimeImport(modulePath) {
  if (!isImportTelemetryEnabled()) {
    return;
  }

  const normalizedPath = normalizeObservedPath(modulePath);
  if (!normalizedPath) {
    return;
  }

  OBSERVED_IMPORTS.add(normalizedPath);
  updateObservedImportStore();
}

async function writeObservedImportsArtifact(payload) {
  const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);
  if (isNode) {
    try {
      const fs = await import('node:fs/promises');
      await fs.mkdir('/artifacts', { recursive: true });
      await fs.writeFile(OBSERVED_IMPORTS_ARTIFACT_PATH, JSON.stringify(payload, null, 2), 'utf-8');
      return;
    } catch {
      return;
    }
  }

  try {
    const body = JSON.stringify(payload, null, 2);
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(OBSERVED_IMPORTS_ARTIFACT_PATH, blob);
      return;
    }

    await fetch(OBSERVED_IMPORTS_ARTIFACT_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true
    });
  } catch {
    // telemetry-only: never throw
  }
}

export async function flushObservedRuntimeImports() {
  if (!isImportTelemetryEnabled()) {
    return;
  }

  const payload = {
    loadedModules: Array.from(OBSERVED_IMPORTS),
    timestamp: new Date().toISOString()
  };

  await writeObservedImportsArtifact(payload);
}

function registerObservedImportFlush() {
  if (flushRegistered || !isImportTelemetryEnabled()) {
    return;
  }

  flushRegistered = true;
  const scope = resolveGlobalScope();
  if (typeof scope?.addEventListener === 'function') {
    scope.addEventListener('pagehide', () => { void flushObservedRuntimeImports(); });
    scope.addEventListener('beforeunload', () => { void flushObservedRuntimeImports(); });
  }

  scope.flushToolNexusRuntimeImportTelemetry = () => flushObservedRuntimeImports();
}

registerObservedImportFlush();

async function loadRuntimeImportAllowlist() {
  if (allowlistCache) {
    return allowlistCache;
  }

  if (!allowlistPromise) {
    allowlistPromise = fetch('/js/runtime-import-allowlist.json', { credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
      })
      .then((payload) => {
        allowlistCache = {
          buildId: payload?.buildId ?? null,
          allowedModules: Array.isArray(payload?.allowedModules) ? payload.allowedModules : [],
          allowedSlugEnhancers: Array.isArray(payload?.allowedSlugEnhancers) ? payload.allowedSlugEnhancers : []
        };

        return allowlistCache;
      })
      .catch(() => {
        console.warn('[RuntimeImportIntegrity] Allowlist unavailable', {
          source: '/js/runtime-import-allowlist.json'
        });
        return null;
      });
  }

  return allowlistPromise;
}

export async function validateRuntimeModulePath(modulePath) {
  if (typeof modulePath !== 'string') {
    console.warn('[RuntimeImportIntegrity] Invalid modulePath', { modulePath, reason: 'non_string' });
    return { valid: false, reason: 'non_string' };
  }

  if (!modulePath.startsWith('/js/')) {
    console.warn('[RuntimeImportIntegrity] Invalid modulePath', { modulePath, reason: 'invalid_prefix' });
    return { valid: false, reason: 'invalid_prefix' };
  }

  if (!modulePath.endsWith('.js')) {
    console.warn('[RuntimeImportIntegrity] Invalid modulePath', { modulePath, reason: 'invalid_suffix' });
    return { valid: false, reason: 'invalid_suffix' };
  }

  const blockedTokens = ['..', '//', 'http', 'https', ':'];
  const matchedToken = blockedTokens.find((token) => modulePath.includes(token));
  if (matchedToken) {
    console.warn('[RuntimeImportIntegrity] Invalid modulePath', { modulePath, reason: 'blocked_token', token: matchedToken });
    return { valid: false, reason: 'blocked_token' };
  }

  const allowlist = await loadRuntimeImportAllowlist();
  if (!allowlist) {
    return { valid: true, reason: 'allowlist_unavailable' };
  }

  if (!allowlist.allowedModules.includes(modulePath)) {
    console.warn('[RuntimeImportIntegrity] Invalid modulePath', { modulePath, reason: 'not_allowlisted' });
    return { valid: false, reason: 'not_allowlisted' };
  }

  return { valid: true };
}

export async function validateRuntimeSlugEnhancer(slug) {
  if (typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug)) {
    console.warn('[RuntimeImportIntegrity] Invalid slug enhancer', { slug, reason: 'invalid_format' });
    return { valid: false, reason: 'invalid_format' };
  }

  const allowlist = await loadRuntimeImportAllowlist();
  if (!allowlist) {
    return { valid: true, reason: 'allowlist_unavailable' };
  }

  if (!allowlist.allowedSlugEnhancers.includes(slug)) {
    console.warn('[RuntimeImportIntegrity] Invalid slug enhancer', { slug, reason: 'not_allowlisted' });
    return { valid: false, reason: 'not_allowlisted' };
  }

  return { valid: true };
}

export async function importRuntimeModule(modulePath) {
  observeRuntimeImport(modulePath);
  return import(modulePath);
}
