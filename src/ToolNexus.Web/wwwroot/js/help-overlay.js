import { modalManager } from './modal-manager.js';

const helpOverlayId = 'shortcutHelp';
const eventController = new AbortController();

bindHelpOverlayEvents();

function isHelpOpen() {
  return modalManager.getTopModalId() === helpOverlayId;
}

function toggleHelpOverlay(forceOpen) {
  const next = typeof forceOpen === 'boolean' ? forceOpen : !isHelpOpen();
  if (next) {
    modalManager.openModal(helpOverlayId, { suspendOthers: true });
    return;
  }
  modalManager.closeModal(helpOverlayId);
}

function handleHelpShortcut(event) {
  const key = event.key.toLowerCase();
  const withMeta = event.metaKey || event.ctrlKey;
  if (!withMeta || key !== '/') return;
  event.preventDefault();
  toggleHelpOverlay();
}

function bindHelpOverlayEvents() {
  window.addEventListener('keydown', handleHelpShortcut, { signal: eventController.signal });
  document.querySelectorAll('[data-shortcut-help-close]').forEach((button) => {
    button.addEventListener('click', () => toggleHelpOverlay(false), { signal: eventController.signal });
  });
}
