import { describe, expect, test, vi } from 'vitest';
import { mountToolLifecycle } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-lifecycle-adapter.js';
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
});
