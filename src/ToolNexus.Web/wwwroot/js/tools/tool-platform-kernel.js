const ROOT_TOOL_INSTANCE_KEY = '__toolNexusPlatformKernelInstance';
const TOOL_ROOT_ID_PREFIX = 'tool-root-';

function noop() {}

function normalizeToolRootInput(input) {
  if (!input) {
    return null;
  }

  if (input instanceof Element) {
    return input;
  }

  const candidates = [
    input.root,
    input.toolRoot,
    input.context?.root,
    input.context?.toolRoot,
    input.executionContext?.root,
    input.executionContext?.toolRoot
  ];

  for (const value of candidates) {
    if (value instanceof Element) {
      return value;
    }
  }

  return null;
}

class ToolPlatformKernel {
  constructor() {
    this.tools = new Map();
  }

  isHTMLElement(root) {
    return Boolean(root && root.nodeType === Node.ELEMENT_NODE && root instanceof HTMLElement);
  }

  isDevelopmentMode() {
    return Boolean(import.meta?.env?.DEV || window.ToolNexusLogging?.runtimeDebugEnabled === true);
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

  normalizeToolRoot(input) {
    return normalizeToolRootInput(input);
  }

  registerTool({ id, root, init, destroy }) {
    if (!id || typeof init !== 'function') {
      throw new Error('registerTool requires id, root, and init().');
    }

    const normalizedRoot = this.normalizeToolRoot(root);

    if (!normalizedRoot) {
      throw new Error('[ToolKernel] registerTool received invalid root context');
    }

    if (this.isDevelopmentMode()) {
      console.debug('[ToolKernel] normalized root', {
        inputType: typeof root,
        resolvedTag: normalizedRoot?.tagName,
        resolvedDataset: normalizedRoot?.dataset
      });
    }

    this.ensureRootId(normalizedRoot, 'registerTool()');

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

  destroyToolById(id, rootOrContext) {
    const root = this.normalizeToolRoot(rootOrContext);
    this.destroy(this.createToolKey(id, root, 'destroyToolById()'));
  }

  createToolKey(id, root, callsite = 'createToolKey()') {
    if (!(root instanceof Element)) {
      throw new Error('[ToolKernel] createToolKey requires Element root');
    }

    return `${id}:${this.ensureRootId(root, callsite)}`;
  }

  ensureRootId(root, callsite = 'ensureRootId()') {
    if (!(root instanceof Element)) {
      throw new Error('[ToolKernel] ensureRootId requires Element root');
    }

    this.assertValidRoot(root, callsite);

    if (root.dataset.toolRootId) {
      return root.dataset.toolRootId;
    }

    const generated = `${TOOL_ROOT_ID_PREFIX}${Math.random().toString(16).slice(2)}`;
    root.dataset.toolRootId = generated;
    return generated;
  }

  getLifecycleState(id, rootOrContext) {
    const root = this.normalizeToolRoot(rootOrContext);
    return this.tools.get(this.createToolKey(id, root, 'getLifecycleState()'))?.state ?? 'missing';
  }

  getRegisteredToolCount() {
    return this.tools.size;
  }

  getLastError(id, rootOrContext) {
    const root = this.normalizeToolRoot(rootOrContext);
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
