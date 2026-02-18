const TRIGGER_SELECTOR = '[data-command-palette-trigger]';
let loaderPromise = null;

function loadPaletteModule() {
  if (!loaderPromise) {
    loaderPromise = import('./command-palette.js');
  }

  return loaderPromise;
}

async function openPalette(seed = '') {
  const module = await loadPaletteModule();
  return module.openCommandPalette(seed);
}

function isEditableElement(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.isContentEditable || target.closest('[contenteditable="true"]')) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

function resolveSeedValue(target) {
  if (!(target instanceof Element)) {
    return '';
  }

  const fromDataAttribute = target.getAttribute('data-command-seed');
  if (fromDataAttribute) {
    return fromDataAttribute.trim();
  }

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
    return (activeElement.value || '').trim();
  }

  return '';
}

document.addEventListener('click', async (event) => {
  const trigger = event.target.closest(TRIGGER_SELECTOR);
  if (!trigger) {
    return;
  }

  event.preventDefault();
  await openPalette(resolveSeedValue(trigger));
});

document.addEventListener('keydown', async (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') {
    return;
  }

  const seed = resolveSeedValue(event.target);

  if (isEditableElement(event.target) && !event.shiftKey) {
    event.preventDefault();
    await openPalette(seed);
    return;
  }

  event.preventDefault();
  await openPalette(seed);
});

window.openCommandPalette = (seed = '') => openPalette(seed);
