import { createTestRoot, destroyTool, mountTool } from './tool-test-helpers.js';
import { getKeyboardEventManager, resetKeyboardEventManagerForTesting } from '../keyboard-event-manager.js';
import { getToolPlatformKernel, resetToolPlatformKernelForTesting } from '../tool-platform-kernel.js';
import { create, runTool } from '../case-converter.js';

describe('case-converter kernel migration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();
  });

  afterEach(() => {
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();
    document.body.innerHTML = '';
  });

  test('core logic behavior is preserved', async () => {
    await expect(runTool('kebab-case', 'Hello World')).resolves.toBe('hello-world');
  });

  test('idempotent app creation for same root', () => {
    const root = createTestRoot();
    const first = create(root);
    const second = create(root);

    expect(first).toBe(second);
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(1);
  });

  test('lifecycle mount/unmount and keyboard event isolation', () => {
    const rootA = createTestRoot();
    const rootB = createTestRoot();

    const handleA = mountTool(create, rootA);
    const handleB = mountTool(create, rootB);

    const manager = getKeyboardEventManager();
    expect(manager.getRegisteredHandlerCount()).toBe(2);
    expect(manager.getActiveGlobalListenerCount()).toBe(1);

    destroyTool(handleA);
    expect(manager.getRegisteredHandlerCount()).toBe(1);

    destroyTool(handleB);
    expect(manager.getRegisteredHandlerCount()).toBe(0);
    expect(manager.getActiveGlobalListenerCount()).toBe(0);
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(0);
  });

  test('remount stress test x50 does not leak handlers', () => {
    const manager = getKeyboardEventManager();

    for (let i = 0; i < 50; i += 1) {
      const root = createTestRoot();
      const handle = mountTool(create, root);
      destroyTool(handle);
      root.remove();
    }

    expect(manager.getRegisteredHandlerCount()).toBe(0);
    expect(manager.getActiveGlobalListenerCount()).toBe(0);
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(0);
  });
});
