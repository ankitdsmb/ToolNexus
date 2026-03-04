import { afterEach, describe, expect, test, vi } from 'vitest';

async function importIntegrityModule() {
  return import(`../../src/ToolNexus.Web/wwwroot/js/runtime/runtime-import-integrity.js?ts=${Date.now()}-${Math.random()}`);
}

afterEach(() => {
  vi.restoreAllMocks();
  delete window.ToolNexusConfig;
  delete globalThis.fetch;
});

describe('runtime import integrity', () => {
  test('rejects invalid module path tokens', async () => {
    window.ToolNexusConfig = { environment: 'development' };
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ allowedModules: ['/js/runtime/'], allowedSlugEnhancers: [] })
    }));

    const { validateRuntimeModulePath } = await importIntegrityModule();

    await expect(validateRuntimeModulePath('/js/runtime/../evil.js')).resolves.toEqual(
      expect.objectContaining({ valid: false, reason: 'blocked_parent_traversal' })
    );
    await expect(validateRuntimeModulePath('/js/runtime/http://evil.js')).resolves.toEqual(
      expect.objectContaining({ valid: false, reason: 'blocked_protocol' })
    );
    await expect(validateRuntimeModulePath('/js/runtime//evil.js')).resolves.toEqual(
      expect.objectContaining({ valid: false, reason: 'blocked_double_slash' })
    );
    await expect(validateRuntimeModulePath('/js/runtime/evil:1.js')).resolves.toEqual(
      expect.objectContaining({ valid: false, reason: 'blocked_colon' })
    );
  });

  test('fails closed in production when allowlist is unavailable', async () => {
    window.ToolNexusConfig = { environment: 'production' };
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network down');
    });

    const { validateRuntimeModulePath } = await importIntegrityModule();

    await expect(validateRuntimeModulePath('/js/runtime/tool-template-loader.js')).resolves.toEqual(
      expect.objectContaining({ valid: false, reason: 'allowlist_unavailable' })
    );
  });

  test('warns-only in development when allowlist is unavailable', async () => {
    window.ToolNexusConfig = { environment: 'development' };
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network down');
    });

    const { validateRuntimeModulePath } = await importIntegrityModule();

    await expect(validateRuntimeModulePath('/js/runtime/tool-template-loader.js')).resolves.toEqual(
      expect.objectContaining({ valid: true, reason: 'allowlist_unavailable' })
    );
  });
});
