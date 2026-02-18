const registry = new Map();

function registerModal(id, handlers = {}) {
  if (!id || typeof id !== 'string') {
    return;
  }

  registry.set(id, {
    open: typeof handlers.open === 'function' ? handlers.open : null,
    close: typeof handlers.close === 'function' ? handlers.close : null
  });
}

function unregisterModal(id) {
  registry.delete(id);
}

function openModal(id, payload) {
  const modal = registry.get(id);
  if (!modal?.open) {
    return Promise.resolve(false);
  }

  return Promise.resolve(modal.open(payload));
}

function closeModal(id) {
  const modal = registry.get(id);
  if (!modal?.close) {
    return false;
  }

  modal.close();
  return true;
}

export const modalManager = {
  registerModal,
  unregisterModal,
  openModal,
  closeModal
};

window.ToolNexusPlatform = {
  ...(window.ToolNexusPlatform || {}),
  modalManager
};
