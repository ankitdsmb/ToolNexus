const ROOT_TOOL_INSTANCE_KEY = '__toolNexusPlatformKernelInstance';
const TOOL_ROOT_ID_PREFIX = 'tool-root-';

function noop() {}

function normalizeToolRoot(rootLike) {
  if (rootLike instanceof Element) return rootLike;
  if (rootLike?.root instanceof Element) return rootLike.root;
  if (rootLike?.toolRoot instanceof Element) return rootLike.toolRoot;
  if (rootLike?.executionContext?.root instanceof Element) {
    return rootLike.executionContext.root;
  }
  return null;
}


function resolveLifecycleInitRoot(args = []) {
  const candidateContext = args[0];
  const lifecycleContext =
    candidateContext?.toolRoot || candidateContext?.root ? candidateContext : null;

  const rootCandidate =
    lifecycleContext?.toolRoot
    || lifecycleContext?.root
    || args[1]
    || candidateContext;

  return {
    lifecycleContext,
    root: normalizeToolRoot(rootCandidate)
  };
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
      '[ToolKernel] invalid root passed\n'
      + 'Expected HTMLElement with runtime tool identity.\n'
      + `Received: ${this.describeRootType(root)}\n`
      + `Callsite: ${callsite}`
    );
  }

  normalizeToolRoot(input) {
    return normalizeToolRoot(input);
  }

  registerTool({ id, root, init, destroy }) {
    if (!id || typeof init !== 'function') {
      throw new Error('registerTool requires id, root, and init().');
    }

    const normalizedRoot = this.normalizeToolRoot(root);

    if (!normalizedRoot) {
      throw new Error('[ToolKernel] Invalid tool root passed to registerTool');
    }

    if (this.isDevelopmentMode()) {
      console.debug('[ToolKernel] normalized root', {
        inputType: this.describeRootType(root),
        resolvedTag: String(normalizedRoot?.tagName ?? '').toLowerCase(),
        resolvedDataset: normalizedRoot?.dataset,
        callsite: 'registerTool()'
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
    const normalizedRoot = this.normalizeToolRoot(root);
    if (!(normalizedRoot instanceof Element)) {
      throw new Error('[ToolKernel] createToolKey requires Element root');
    }

    return `${id}:${this.ensureRootId(normalizedRoot, callsite)}`;
  }

  ensureRootId(root, callsite = 'ensureRootId()') {
    const normalizedRoot = this.normalizeToolRoot(root);
    if (!(normalizedRoot instanceof Element)) {
      throw new Error('[ToolKernel] ensureRootId requires Element root');
    }

    this.assertValidRoot(normalizedRoot, callsite);

    if (normalizedRoot.dataset.toolRootId) {
      return normalizedRoot.dataset.toolRootId;
    }

    const generated = `${TOOL_ROOT_ID_PREFIX}${Math.random().toString(16).slice(2)}`;
    normalizedRoot.dataset.toolRootId = generated;
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

function getToolPlatformKernel() {
  if (!globalKernel) {
    globalKernel = new ToolPlatformKernel();
  }

  return globalKernel;
}

function resetToolPlatformKernelForTesting() {
  globalKernel?.resetForTesting();
  globalKernel = undefined;
}

if (typeof normalizeToolRoot !== 'function') {
  throw new Error('[KernelContract] normalizeToolRoot export missing');
}

export {
  getToolPlatformKernel,
  normalizeToolRoot,
  resolveLifecycleInitRoot,
  resetToolPlatformKernelForTesting
};
