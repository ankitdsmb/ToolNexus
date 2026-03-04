import {
  __resetToolIndexForTests,
  loadToolIndex,
  resolveTool,
  resolveToolModule
} from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-index.js';
import {
  __resetToolModuleLoaderForTests,
  hasLoadedToolModule,
  loadToolModule
} from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-module-loader.js';

jest.mock('../../../src/ToolNexus.Web/wwwroot/js/runtime/runtime-import-integrity.js', () => ({
  validateRuntimeModulePath: jest.fn(async () => ({ valid: true })),
  importRuntimeModule: jest.fn(async () => ({ create: jest.fn(), init: jest.fn() }))
}));

describe('tool index + module loader', () => {
  beforeEach(() => {
    __resetToolIndexForTests();
    __resetToolModuleLoaderForTests();
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        version: '1.0',
        runtimeAbi: '2.0',
        tools: {
          'css-minifier': {
            module: '/js/tools/css-minifier.js',
            abi: '2.0',
            permissions: ['dom'],
            tier: 'A'
          }
        }
      })
    }));
  });

  test('loads and resolves index entries', async () => {
    await loadToolIndex();

    expect(resolveTool('css-minifier')).toMatchObject({ module: '/js/tools/css-minifier.js' });
    expect(resolveToolModule('css-minifier')).toBe('/js/tools/css-minifier.js');
  });

  test('lazy loader deduplicates concurrent imports', async () => {
    await loadToolIndex();

    const [a, b] = await Promise.all([
      loadToolModule('css-minifier'),
      loadToolModule('css-minifier')
    ]);

    expect(a).toBe(b);
    expect(hasLoadedToolModule('css-minifier')).toBe(true);
  });
});
