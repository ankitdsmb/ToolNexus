const ROOT_TOOL_INSTANCE_KEY = '__toolNexusPlatformKernelInstance';

function noop() {}

class ToolPlatformKernel {
  constructor() {
    this.tools = new Map();
  }

  registerTool({ id, root, init, destroy }) {
    if (!id || !root || typeof init !== 'function') {
      throw new Error('registerTool requires id, root, and init().');
    }

    const toolKey = this.createToolKey(id, root);
    const existing = this.tools.get(toolKey);
    if (existing) {
      return existing.handle;
    }

    const registration = {
      id,
      root,
      init,
      destroy: typeof destroy === 'function' ? destroy : noop,
      state: 'created',
      instance: null,
      error: null
    };

    const handle = {
      id,
      root,
      create: () => this.create(toolKey),
      init: () => this.initialize(toolKey),
      destroy: () => this.destroy(toolKey)
    };

    registration.handle = handle;
    this.tools.set(toolKey, registration);

    root[ROOT_TOOL_INSTANCE_KEY] = root[ROOT_TOOL_INSTANCE_KEY] || new Map();
    root[ROOT_TOOL_INSTANCE_KEY].set(id, handle);

    return handle;
  }

  create(toolKey) {
    const registration = this.tools.get(toolKey);
    if (!registration || registration.state !== 'created') {
      return registration?.instance;
    }

    registration.state = 'initialized';
    registration.instance = registration.init(registration.root) ?? null;
    registration.error = null;
    return registration.instance;
  }

  initialize(toolKey) {
    return this.create(toolKey);
  }

  mountTool(toolRegistration) {
    const handle = this.registerTool(toolRegistration);
    handle.create();
    handle.init();
    return handle;
  }

  destroy(toolKey) {
    const registration = this.tools.get(toolKey);
    if (!registration || registration.state === 'destroyed') {
      return;
    }

    registration.destroy(registration.instance, registration.root);
    registration.state = 'destroyed';

    const rootRegistry = registration.root?.[ROOT_TOOL_INSTANCE_KEY];
    rootRegistry?.delete(registration.id);
    if (rootRegistry?.size === 0) {
      delete registration.root[ROOT_TOOL_INSTANCE_KEY];
    }

    this.tools.delete(toolKey);
  }

  destroyToolById(id, root) {
    this.destroy(this.createToolKey(id, root));
  }

  createToolKey(id, root) {
    return `${id}:${this.ensureRootId(root)}`;
  }

  ensureRootId(root) {
    if (root.dataset.toolRootId) {
      return root.dataset.toolRootId;
    }

    const generated = `tool-root-${Math.random().toString(16).slice(2)}`;
    root.dataset.toolRootId = generated;
    return generated;
  }

  getLifecycleState(id, root) {
    return this.tools.get(this.createToolKey(id, root))?.state ?? 'missing';
  }

  getRegisteredToolCount() {
    return this.tools.size;
  }

  resetForTesting() {
    for (const toolKey of Array.from(this.tools.keys())) {
      this.destroy(toolKey);
    }
  }
}

let globalKernel;

export function getToolPlatformKernel() {
  if (!globalKernel) {
    globalKernel = new ToolPlatformKernel();
  }

  return globalKernel;
}

export function resetToolPlatformKernelForTesting() {
  globalKernel?.resetForTesting();
  globalKernel = undefined;
}
