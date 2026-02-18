const Z_INDEX = {
  base: 10,
  header: 100,
  dropdown: 200,
  overlay: 500,
  modal: 600,
  palette: 700,
  toast: 800,
  critical: 900
};

class ModalManager {
  constructor() {
    this.modals = new Map();
    this.stack = [];
    this.suspended = [];
    this.activeModalId = null;
    this.handleKeydown = this.handleKeydown.bind(this);
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;
    console.log('ModalManager initialized');
    document.querySelectorAll('[data-modal-root][data-modal-id]').forEach((node) => this.registerModal(node));
    window.addEventListener('keydown', this.handleKeydown);
  }

  registerModal(element) {
    const id = element?.dataset?.modalId;
    if (!id) return;
    if (this.modals.has(id)) {
      console.warn(`Modal ${id} already registered.`);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;
    const backdrop = element.querySelector('[data-modal-backdrop]');
    const dialog = element.querySelector('[data-modal-dialog]');

    backdrop?.addEventListener('click', (event) => {
      event.preventDefault();
      if (this.getTopModalId() !== id) return;
      this.closeModal(id);
    }, { signal });

    dialog?.addEventListener('click', (event) => {
      event.stopPropagation();
    }, { signal });

    if (element.hidden || !element.classList.contains('is-open')) {
      element.dataset.state = 'closed';
    }

    this.modals.set(id, { id, element, backdrop, dialog, controller });
    this.applyZIndex();
  }

  unregisterModal(id) {
    const modal = this.modals.get(id);
    if (!modal) return;

    modal.controller.abort();
    this.modals.delete(id);
    this.stack = this.stack.filter((item) => item !== id);
    this.activeModalId = this.getTopModalId();
    this.syncBodyLock();
    this.applyZIndex();
  }

  openModal(id, options = {}) {
    this.init();

    const modal = this.modals.get(id) || this.tryRegisterById(id);
    if (!modal) return false;

    if (this.stack.includes(id)) {
      console.warn(`Modal ${id} already in stack.`);
      this.activeModalId = id;
      this.applyZIndex();
      return true;
    }

    if (options.suspendOthers && this.stack.length) {
      this.suspended = [...this.stack];
      this.closeAllModals({ preserveSuspended: true });
    }

    this.stack.push(id);
    this.activeModalId = id;

    modal.element.hidden = false;
    modal.element.classList.add('is-open');
    modal.element.dataset.state = 'open';
    this.syncBodyLock();
    this.applyZIndex();
    requestAnimationFrame(() => modal.dialog?.focus?.());
    window.dispatchEvent(new CustomEvent('toolnexus:modalchange', { detail: { activeModalId: id, stack: [...this.stack] } }));
    return true;
  }

  closeModal(id, options = {}) {
    if (!this.modals.has(id)) return false;

    const modal = this.modals.get(id);
    if (!modal) return false;

    if (modal.element.classList.contains('is-closing')) return false;

    modal.element.classList.remove('is-open');
    modal.element.classList.add('is-closing');

    const finish = () => {
      modal.element.classList.remove('is-closing');
      modal.element.hidden = true;
      modal.element.dataset.state = 'closed';
      this.stack = this.stack.filter((item) => item !== id);
      this.activeModalId = this.getTopModalId();
      this.syncBodyLock();
      this.applyZIndex();

      if (!this.stack.length && this.suspended.length && !options.skipRestore) {
        const restore = [...this.suspended];
        this.suspended = [];
        restore.forEach((modalId) => this.openModal(modalId));
      }

      if (modal.element.dataset.modalRemoveOnClose === 'true') {
        modal.element.remove();
        this.unregisterModal(id);
      }

      window.dispatchEvent(new CustomEvent('toolnexus:modalchange', { detail: { activeModalId: this.activeModalId, stack: [...this.stack] } }));
    };

    setTimeout(finish, 160);
    return true;
  }

  closeAllModals(options = {}) {
    const ids = [...this.stack].reverse();
    ids.forEach((id) => this.closeModal(id, { skipRestore: true }));
    if (!options.preserveSuspended) {
      this.suspended = [];
    }
  }

  handleKeydown(event) {
    if (event.key !== 'Escape') return;
    const top = this.getTopModalId();
    if (!top) return;
    event.preventDefault();
    this.closeModal(top);
  }

  syncBodyLock() {
    document.body.classList.toggle('is-modal-open', this.stack.length > 0);
  }

  applyZIndex() {
    this.stack.forEach((id, index) => {
      const modal = this.modals.get(id);
      if (!modal) return;
      const isPalette = id === 'commandPalette';
      const base = isPalette ? Z_INDEX.palette : Z_INDEX.modal;
      modal.element.style.zIndex = String(base + index);
      if (modal.backdrop) modal.backdrop.style.zIndex = String(base + index);
      if (modal.dialog) modal.dialog.style.zIndex = String(base + index + 1);
    });
  }

  getTopModalId() {
    return this.stack[this.stack.length - 1] ?? null;
  }

  tryRegisterById(id) {
    const element = document.querySelector(`[data-modal-root][data-modal-id="${id}"]`);
    if (!element) return null;
    this.registerModal(element);
    return this.modals.get(id) ?? null;
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeydown);
    this.modals.forEach((modal, id) => {
      modal.controller.abort();
      this.unregisterModal(id);
    });
    this.initialized = false;
  }
}

export const modalManager = new ModalManager();

document.addEventListener('DOMContentLoaded', () => {
  modalManager.init();
});

window.addEventListener('beforeunload', () => modalManager.destroy());

export { Z_INDEX };
