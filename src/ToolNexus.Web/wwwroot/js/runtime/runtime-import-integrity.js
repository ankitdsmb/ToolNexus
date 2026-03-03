let allowlistCache = null;
let allowlistPromise = null;

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
