import { describe, expect, test, vi } from 'vitest';
import { legacyAutoInit, mountToolLifecycle } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-lifecycle-adapter.js';
import { createToolExecutionContext } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-execution-context.js';

describe('lifecycle adapter compatibility', () => {
  test('mounts lifecycle modules with create/init/destroy contract', async () => {
    const root = document.createElement('div');
    const context = createToolExecutionContext({ slug: 'vitest-tool', root, manifest: { slug: 'vitest-tool' } });
    const destroy = vi.fn();

    const result = await mountToolLifecycle({
      slug: 'vitest-tool',
      root,
      manifest: { slug: 'vitest-tool' },
      context,
      capabilities: {},
      module: {
        create: async () => ({ ok: true }),
        init: async () => { root.innerHTML = '<div data-mounted="true"></div>'; },
        destroy
      }
    });

    expect(result.mounted).toBe(true);
    await result.cleanup();
    expect(destroy).toHaveBeenCalledOnce();
  });

  test('returns normalized empty lifecycle result when no adapter contract exists', async () => {
    const root = document.createElement('div');
    const context = createToolExecutionContext({ slug: 'empty-tool', root, manifest: { slug: 'empty-tool' } });

    const result = await mountToolLifecycle({
      slug: 'empty-tool',
      root,
      manifest: { slug: 'empty-tool' },
      context,
      capabilities: {},
      module: {}
    });

    expect(result).toEqual({
      mounted: false,
      cleanup: undefined,
      mode: 'none',
      normalized: false,
      autoDestroyGenerated: false
    });
  });

  test('legacy auto init keeps normalized lifecycle result contract', async () => {
    const root = document.createElement('div');
    const context = createToolExecutionContext({ slug: 'legacy-tool', root, manifest: { slug: 'legacy-tool' } });
    const runTool = vi.fn(() => {
      root.innerHTML = '<section>legacy</section>';
    });

    const previousRegistry = window.ToolNexusModules;
    window.ToolNexusModules = { 'legacy-tool': { runTool } };

    try {
      const result = await legacyAutoInit({
        slug: 'legacy-tool',
        root,
        manifest: { slug: 'legacy-tool' },
        context,
        capabilities: {}
      });

      expect(result.mounted).toBe(true);
      expect(result.mode).toBe('legacy.auto-init');
      expect(typeof result.cleanup).toBe('function');
      expect(result.normalized).toBe(true);
      expect(result.autoDestroyGenerated).toBe(true);
    } finally {
      window.ToolNexusModules = previousRegistry;
    }
  });
});
