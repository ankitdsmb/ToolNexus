import { describe, expect, test } from 'vitest';
import {
  getToolPlatformKernel,
  resetToolPlatformKernelForTesting
} from '../../src/ToolNexus.Web/wwwroot/js/tools/tool-platform-kernel.js';

describe('tool platform kernel runtime contract', () => {
  test('register/mount tracks lifecycle and root id', () => {
    resetToolPlatformKernelForTesting();
    const kernel = getToolPlatformKernel();
    const root = document.createElement('div');

    const handle = kernel.registerTool({
      id: 'json-formatter',
      root,
      init: () => ({ mounted: true })
    });

    handle.init();

    expect(root.dataset.toolRootId).toBeTruthy();
    expect(kernel.getLifecycleState('json-formatter', root)).toBe('initialized');
    expect(kernel.getRegisteredToolCount()).toBe(1);
  });
});
