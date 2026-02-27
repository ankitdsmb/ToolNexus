import {
  getToolPlatformKernel,
  resetToolPlatformKernelForTesting
} from '../../src/ToolNexus.Web/wwwroot/js/tools/tool-platform-kernel.js';

describe('tool-platform-kernel root normalization', () => {
  afterEach(() => {
    resetToolPlatformKernelForTesting();
  });

  function registerWith(rootLike) {
    const kernel = getToolPlatformKernel();
    return kernel.registerTool({
      id: 'root-normalization',
      root: rootLike,
      init: () => null,
      destroy: () => undefined
    });
  }

  test('registerTool(element)', () => {
    const root = document.createElement('section');
    const handle = registerWith(root);
    expect(handle.root).toBe(root);
  });

  test('registerTool({root})', () => {
    const root = document.createElement('section');
    const handle = registerWith({ root });
    expect(handle.root).toBe(root);
  });

  test('registerTool({toolRoot})', () => {
    const root = document.createElement('section');
    const handle = registerWith({ toolRoot: root });
    expect(handle.root).toBe(root);
  });

  test('registerTool({context:{root}})', () => {
    const root = document.createElement('section');
    const handle = registerWith({ context: { root } });
    expect(handle.root).toBe(root);
  });

  test('registerTool(runtime execution context)', () => {
    const root = document.createElement('section');
    const executionContext = {
      lifecycleContext: {
        executionContext: {
          context: {
            toolRoot: root
          }
        }
      }
    };

    const handle = registerWith(executionContext);
    expect(handle.root).toBe(root);
  });
});
