const SUPPORTED_MOUNT_MODES = new Set(['fullscreen', 'panel', 'inline', 'popover', 'command']);

function normalizeMountMode(mountMode) {
  const normalized = String(mountMode ?? 'fullscreen').trim().toLowerCase();
  return SUPPORTED_MOUNT_MODES.has(normalized) ? normalized : 'fullscreen';
}

export function createToolContainerManager({ doc = document } = {}) {
  let sequence = 0;
  const mounts = new Map();

  function createNodes({ toolId, mountMode }) {
    const container = doc.createElement('section');
    container.className = `tool-container tool-container--${mountMode}`;
    container.dataset.mountMode = mountMode;
    container.dataset.toolId = toolId;

    const root = doc.createElement('div');
    root.className = 'tool-container__root';
    root.dataset.toolRoot = 'true';
    root.dataset.toolSlug = toolId;
    root.dataset.mountMode = mountMode;

    container.append(root);
    return { container, root };
  }

  function mount({ host, toolId, mountMode = 'fullscreen' } = {}) {
    const resolvedHost = host ?? doc.body;
    const resolvedMode = normalizeMountMode(mountMode);
    const mountId = `tool-mount-${++sequence}`;
    const { container, root } = createNodes({ toolId, mountMode: resolvedMode });

    resolvedHost.append(container);

    mounts.set(mountId, {
      mountId,
      toolId,
      mountMode: resolvedMode,
      host: resolvedHost,
      container,
      root,
      listeners: [],
      cleanup: null
    });

    return {
      mountId,
      container,
      root,
      mountMode: resolvedMode
    };
  }

  function setCleanup(mountId, cleanup) {
    const record = mounts.get(mountId);
    if (!record) {
      return;
    }

    record.cleanup = typeof cleanup === 'function' ? cleanup : null;
  }

  function addListener(mountId, target, type, handler, options) {
    const record = mounts.get(mountId);
    if (!record || !target?.addEventListener || typeof handler !== 'function') {
      return () => {};
    }

    target.addEventListener(type, handler, options);
    const entry = { target, type, handler, options };
    record.listeners.push(entry);

    return () => {
      target.removeEventListener(type, handler, options);
      const index = record.listeners.indexOf(entry);
      if (index >= 0) {
        record.listeners.splice(index, 1);
      }
    };
  }

  async function unmount(mountId) {
    const record = mounts.get(mountId);
    if (!record) {
      return false;
    }

    mounts.delete(mountId);

    for (const listener of record.listeners.splice(0)) {
      listener.target?.removeEventListener?.(listener.type, listener.handler, listener.options);
    }

    if (typeof record.cleanup === 'function') {
      await record.cleanup();
    }

    if (record.container?.parentNode) {
      record.container.parentNode.removeChild(record.container);
    }

    return true;
  }

  async function cleanupAll() {
    const ids = Array.from(mounts.keys());
    for (const mountId of ids) {
      await unmount(mountId);
    }
  }

  return {
    mount,
    setCleanup,
    addListener,
    unmount,
    cleanupAll,
    getActiveMounts() {
      return Array.from(mounts.values()).map((entry) => ({
        mountId: entry.mountId,
        toolId: entry.toolId,
        mountMode: entry.mountMode
      }));
    }
  };
}

export function normalizeToolMountMode(mountMode) {
  return normalizeMountMode(mountMode);
}

