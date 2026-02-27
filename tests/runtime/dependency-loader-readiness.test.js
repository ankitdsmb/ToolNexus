import { describe, expect, test } from 'vitest';
import { createDependencyLoader } from '../../src/ToolNexus.Web/wwwroot/js/runtime/dependency-loader.js';

describe('runtime dependency readiness', () => {
  test('monaco capability readiness fails when require exists but monaco editor is unavailable', async () => {
    window.require = () => {};
    delete window.monaco;

    const loader = createDependencyLoader({
      loadScript: async () => {}
    });

    await expect(loader.loadDependencies({
      toolSlug: 'json-formatter',
      dependencies: [
        {
          src: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs/loader.min.js',
          ready: () => Boolean(window.monaco?.editor)
        }
      ]
    })).rejects.toThrow('Dependency readiness check failed');
  });
});
