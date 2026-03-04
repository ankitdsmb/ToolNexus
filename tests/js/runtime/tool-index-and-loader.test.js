import {
  __resetToolIndexForTests,
  getToolMetadata,
  loadToolIndex,
  resolveRoute,
  resolveTool,
  resolveToolModule
} from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-index.js';
import {
  __resetToolModuleLoaderForTests,
  hasLoadedToolModule,
  loadToolModule
} from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-module-loader.js';

const runtimeImportIntegrityMock = {
  validateRuntimeModulePath: jest.fn(async () => ({ valid: true })),
  importRuntimeModule: jest.fn(async () => ({ create: jest.fn(), init: jest.fn() }))
};

jest.mock('../../../src/ToolNexus.Web/wwwroot/js/runtime/runtime-import-integrity.js', () => runtimeImportIntegrityMock);

describe('tool index + module loader', () => {
  beforeEach(() => {
    __resetToolIndexForTests();
    __resetToolModuleLoaderForTests();
    runtimeImportIntegrityMock.validateRuntimeModulePath.mockClear();
    runtimeImportIntegrityMock.importRuntimeModule.mockClear();
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        version: '2026.03',
        runtimeAbi: '2.0',
        tools: {
          'css-minifier': {
            module: '/js/tools/css-minifier.js',
            abi: '2.0',
            permissions: ['dom'],
            tier: 'A',
            warmupPriority: 2,
            route: '/css-minifier',
            certification: {
              tier: 'gold',
              signature: 'sha256:test-signature',
              maxMemory: '5mb',
              maxExecutionTime: 2000
            }
          }
        }
      })
    }));
  });

  test('loads and resolves index entries + metadata', async () => {
    await loadToolIndex();

    expect(resolveTool('css-minifier')).toMatchObject({ module: '/js/tools/css-minifier.js' });
    expect(resolveToolModule('css-minifier')).toBe('/js/tools/css-minifier.js');
    expect(resolveRoute('/css-minifier')).toMatchObject({ module: '/js/tools/css-minifier.js' });
    expect(getToolMetadata('css-minifier')).toMatchObject({
      abi: '2.0',
      warmupPriority: 2,
      certification: { signature: 'sha256:test-signature' }
    });
  });

  test('lazy loader deduplicates concurrent imports', async () => {
    await loadToolIndex();

    const [a, b] = await Promise.all([
      loadToolModule('css-minifier', { runtimeAbi: '2.0' }),
      loadToolModule('css-minifier', { runtimeAbi: '2.0' })
    ]);

    expect(a).toBe(b);
    expect(hasLoadedToolModule('css-minifier')).toBe(true);
    expect(runtimeImportIntegrityMock.importRuntimeModule).toHaveBeenCalledTimes(1);
  });

  test('rejects incompatible ABI versions', async () => {
    await loadToolIndex();

    await expect(loadToolModule('css-minifier', { runtimeAbi: '3.0' })).rejects.toThrow('ABI mismatch');
  });
});
