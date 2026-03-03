const runtimeImportSet = new Set();

function resolveScope() {
  if (typeof window !== 'undefined') {
    return window;
  }

  return globalThis;
}

function isDevelopmentMode() {
  const scope = resolveScope();
  const config = scope?.ToolNexusConfig ?? {};
  const env = String(config.environment ?? config.env ?? scope?.process?.env?.NODE_ENV ?? '').trim().toLowerCase();

  if (!env) {
    return true;
  }

  return env !== 'production' && env !== 'prod';
}

export function recordModuleImport(modulePath) {
  if (typeof modulePath !== 'string' || modulePath.length === 0) {
    return;
  }

  runtimeImportSet.add(modulePath);
}

export function getRuntimeImportSnapshot() {
  return Array.from(runtimeImportSet);
}

if (typeof window !== 'undefined' && isDevelopmentMode()) {
  window.__runtimeImportSnapshot = getRuntimeImportSnapshot;
}
