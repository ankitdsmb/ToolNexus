import { describe, expect, test, vi } from 'vitest';
import { loadManifest } from '../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';

describe('tool runtime manifest endpoint override', () => {
  test('uses configured manifest endpoint for admin preview virtual tools', async () => {
    window.ToolNexusConfig = {
      manifestEndpoint: '/admin/ai-capability-factory/import/preview/{slug}/manifest'
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ slug: 'draft-tool' })
    });

    const result = await loadManifest('draft-tool');

    expect(fetchSpy).toHaveBeenCalledWith('/admin/ai-capability-factory/import/preview/draft-tool/manifest', expect.anything());
    expect(result.slug).toBe('draft-tool');

    fetchSpy.mockRestore();
    delete window.ToolNexusConfig;
  });
});
