import { initializeJsonValidator } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-json-validator]');
  if (!root) {
    return;
  }

  initializeJsonValidator(root);
});
