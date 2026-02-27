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

  test('registerTool({executionContext:{root}})', () => {
    const root = document.createElement('section');
    const executionContextPayload = {
      executionContext: {
        root
      }
    };

    const handle = registerWith(executionContextPayload);
    expect(handle.root).toBe(root);
  });
});
