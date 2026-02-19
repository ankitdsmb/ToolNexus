import { jest } from '@jest/globals';
import {
  getToolPlatformKernel,
  resetToolPlatformKernelForTesting
} from '../../src/ToolNexus.Web/wwwroot/js/tools/tool-platform-kernel.js';

describe('tool-platform-kernel', () => {
  afterEach(() => {
    resetToolPlatformKernelForTesting();
  });

  test('registerTool is idempotent and lifecycle is tracked', () => {
    const root = document.createElement('section');
    document.body.appendChild(root);

    const initMock = jest.fn(() => ({ stop: jest.fn() }));
    const destroyMock = jest.fn();
    const kernel = getToolPlatformKernel();

    const handleA = kernel.registerTool({ id: 'sample', root, init: initMock, destroy: destroyMock });
    const handleB = kernel.registerTool({ id: 'sample', root, init: initMock, destroy: destroyMock });

    expect(handleA).toBe(handleB);
    expect(kernel.getLifecycleState('sample', root)).toBe('created');

    handleA.init();
    expect(initMock).toHaveBeenCalledTimes(1);
    expect(kernel.getLifecycleState('sample', root)).toBe('initialized');

    handleA.destroy();
    expect(destroyMock).toHaveBeenCalledTimes(1);
    expect(kernel.getLifecycleState('sample', root)).toBe('missing');
  });
});
