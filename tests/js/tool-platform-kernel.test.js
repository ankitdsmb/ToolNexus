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

  test('init failures are captured without hard-throwing runtime', () => {
    const root = document.createElement('section');
    document.body.appendChild(root);

    const initMock = jest.fn(() => {
      throw new Error('boom');
    });

    const kernel = getToolPlatformKernel();
    const handle = kernel.registerTool({ id: 'broken-tool', root, init: initMock });

    expect(() => handle.init()).not.toThrow();
    expect(kernel.getLifecycleState('broken-tool', root)).toBe('failed');
    expect(kernel.getLastError('broken-tool', root)?.message).toBe('boom');
  });

  test('destroy failures are captured and cleanup still completes', () => {
    const root = document.createElement('section');
    document.body.appendChild(root);

    const destroyMock = jest.fn(() => {
      throw new Error('destroy failed');
    });

    const kernel = getToolPlatformKernel();
    const handle = kernel.registerTool({ id: 'destroy-broken', root, init: () => ({}), destroy: destroyMock });

    handle.init();
    expect(() => handle.destroy()).not.toThrow();
    expect(kernel.getLifecycleState('destroy-broken', root)).toBe('missing');
  });

  test('registerTool throws actionable error for invalid root', () => {
    const kernel = getToolPlatformKernel();

    expect(() => kernel.registerTool({ id: 'broken-root', root: undefined, init: () => ({}) }))
      .toThrow('[ToolKernel] Invalid tool root passed to registerTool');
  });

});
