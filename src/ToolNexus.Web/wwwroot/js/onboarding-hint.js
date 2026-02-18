import { uiStateManager } from './ui-state-manager.js';

const hintId = 'shortcutHint';
const eventController = new AbortController();

initShortcutHint();

function initShortcutHint() {
  if (!uiStateManager.hasSeenShortcutHint()) {
    showShortcutHint();
    uiStateManager.markShortcutHintSeen();
  }

  document.querySelectorAll('[data-shortcut-hint-close]')
    .forEach((btn) => btn.addEventListener('click', hideShortcutHint, { signal: eventController.signal }));
}

function showShortcutHint() {
  const hint = document.getElementById(hintId);
  if (!hint) return;

  hint.hidden = false;
  requestAnimationFrame(() => hint.classList.add('is-visible'));
}

function hideShortcutHint() {
  const hint = document.getElementById(hintId);
  if (!hint) return;

  hint.classList.remove('is-visible');
  setTimeout(() => {
    hint.hidden = true;
  }, 150);
}
