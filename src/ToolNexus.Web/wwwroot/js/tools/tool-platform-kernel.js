const ROOT_TOOL_INSTANCE_KEY = '__toolNexusPlatformKernelInstance';
const TOOL_ROOT_ID_PREFIX = 'tool-root-';

function noop() {}

class ToolPlatformKernel {
  constructor() {
    this.tools = new Map();
  }

  isHTMLElement(root) {
    return Boolean(root && root.nodeType === Node.ELEMENT_NODE && root instanceof HTMLElement);
  }

  describeRootType(root) {
    if (root === undefined) {
      return 'undefined';
    }

    if (root === null) {
      return 'null';
    }

    if (this.isHTMLElement(root)) {
      return `HTMLElement<${String(root.tagName).toLowerCase()}>`;
    }

    if (typeof root === 'object') {
      return root.constructor?.name ? `object:${root.constructor.name}` : 'object';
    }

    return typeof root;
  }

  assertValidRoot(root, callsite = 'registerTool()') {
    if (this.isHTMLElement(root)) {
      return;
    }

    throw new Error(
      '[ToolKernel] Invalid root passed to registerTool()\n'
      + 'Expected HTMLElement with runtime tool identity.\n'
      + `Received: ${this.describeRootType(root)}\n`
      + `Callsite: ${callsite}`
    );
  }

  normalizeToolRoot(rootOrContext, callsite = 'registerTool()') {
    if (this.isHTMLElement(rootOrContext)) {
      return rootOrContext;
    }

    const candidate = rootOrContext?.root
      ?? rootOrContext?.toolRoot
      ?? rootOrContext?.context?.root
      ?? rootOrContext?.context?.toolRoot;

    if (this.isHTMLElement(candidate)) {
      return candidate;
    }

    throw new Error(
      '[ToolKernel] Invalid root passed to registerTool()\n'
      + 'Supported values: HTMLElement | { root } | { toolRoot } | { context: { root | toolRoot } }\n'
      + `Received: ${this.describeRootType(rootOrContext)}\n`
      + `Callsite: ${callsite}`
    );
  }

  registerTool({ id, root, init, destroy }) {
    if (!id || typeof init !== 'function') {
      throw new Error('registerTool requires id, root, and init().');
    }

    const normalizedRoot = this.normalizeToolRoot(root, 'registerTool()');
    this.assertValidRoot(normalizedRoot, 'registerTool()');

    const toolKey = this.createToolKey(id, normalizedRoot, 'registerTool()');
    const existing = this.tools.get(toolKey);
    if (existing) {
      return existing.handle;
    }

    const registration = {
      id,
      root: normalizedRoot,
      init,
      destroy: typeof destroy === 'function' ? destroy : noop,
      state: 'created',
      instance: null,
      error: null
    };

    const handle = {
      id,
      root: normalizedRoot,
      create: () => this.create(toolKey),
      init: () => this.initialize(toolKey),
      destroy: () => this.destroy(toolKey)
    };

    registration.handle = handle;
    this.tools.set(toolKey, registration);

    normalizedRoot[ROOT_TOOL_INSTANCE_KEY] = normalizedRoot[ROOT_TOOL_INSTANCE_KEY] || new Map();
    normalizedRoot[ROOT_TOOL_INSTANCE_KEY].set(id, handle);

    return handle;
  }

  create(toolKey) {
    const registration = this.tools.get(toolKey);
    if (!registration || registration.state !== 'created') {
      return registration?.instance;
    }

    try {
      registration.state = 'initialized';
      registration.instance = registration.init(registration.root) ?? null;
      registration.error = null;
    } catch (error) {
      registration.state = 'failed';
      registration.instance = null;
      registration.error = error;
      console.warn(`tool-platform-kernel: init failed for "${registration.id}".`, error);
    }

    return registration.instance;
  }

  initialize(toolKey) {
    return this.create(toolKey);
  }

  mountTool(toolRegistration) {
    const handle = this.registerTool(toolRegistration);
    handle.init();
    return handle;
  }

  destroy(toolKey) {
    const registration = this.tools.get(toolKey);
    if (!registration || registration.state === 'destroyed') {
      return;
    }

    try {
      registration.destroy(registration.instance, registration.root);
    } catch (error) {
      registration.error = error;
      console.warn(`tool-platform-kernel: destroy failed for "${registration.id}".`, error);
    }

    registration.state = 'destroyed';

    const rootRegistry = registration.root?.[ROOT_TOOL_INSTANCE_KEY];
    rootRegistry?.delete(registration.id);
    if (rootRegistry?.size === 0) {
      delete registration.root[ROOT_TOOL_INSTANCE_KEY];
    }

    this.tools.delete(toolKey);
  }

  destroyToolById(id, root) {
    this.destroy(this.createToolKey(id, root, 'destroyToolById()'));
  }

  createToolKey(id, root, callsite = 'createToolKey()') {
    return `${id}:${this.ensureRootId(root, callsite)}`;
  }

  ensureRootId(root, callsite = 'ensureRootId()') {
    this.assertValidRoot(root, callsite);

    if (root.dataset.toolRootId) {
      return root.dataset.toolRootId;
    }

    const generated = `${TOOL_ROOT_ID_PREFIX}${Math.random().toString(16).slice(2)}`;
    root.dataset.toolRootId = generated;
    return generated;
  }

  getLifecycleState(id, root) {
    return this.tools.get(this.createToolKey(id, root, 'getLifecycleState()'))?.state ?? 'missing';
  }

  getRegisteredToolCount() {
    return this.tools.size;
  }

  getLastError(id, root) {
    return this.tools.get(this.createToolKey(id, root, 'getLastError()'))?.error ?? null;
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

export function normalizeToolRoot(rootOrContext) {
  return getToolPlatformKernel().normalizeToolRoot(rootOrContext, 'normalizeToolRoot()');
}

export function resetToolPlatformKernelForTesting() {
  globalKernel?.resetForTesting();
  globalKernel = undefined;
}
